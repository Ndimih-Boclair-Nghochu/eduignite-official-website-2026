"""
Seed helper – Step 04: Student accounts, Student profiles, Parent accounts,
and ParentStudentLink relationships.

Creates 6 students + 3 parents per school, with realistic parent-child links.
"""
from datetime import date
from core.image_utils import generate_placeholder_avatar

DEFAULT_PASSWORD = "EduIgnite@2026!"

STUDENT_ROSTER = [
    {"first": "Alice",   "last": "Fon",      "gender": "female", "level": "form5",       "section": "science",    "dob": date(2008, 3, 14)},
    {"first": "Brian",   "last": "Ngwa",     "gender": "male",   "level": "form4",       "section": "general",    "dob": date(2009, 7, 22)},
    {"first": "Celine",  "last": "Mboum",    "gender": "female", "level": "lower_sixth", "section": "arts",       "dob": date(2007, 11, 5)},
    {"first": "David",   "last": "Tabi",     "gender": "male",   "level": "form3",       "section": "general",    "dob": date(2010, 1, 30)},
    {"first": "Esther",  "last": "Njoku",    "gender": "female", "level": "upper_sixth", "section": "commercial", "dob": date(2006, 6, 18)},
    {"first": "Fabrice", "last": "Eyike",    "gender": "male",   "level": "form2",       "section": "technical",  "dob": date(2011, 9, 3)},
]

PARENT_ROSTER = [
    {"name": "Mr. Paul Fon",      "email_tag": "pfon",    "phone_suffix": "11", "relationship": "father"},
    {"name": "Mrs. Rose Ngwa",    "email_tag": "rngwa",   "phone_suffix": "12", "relationship": "mother"},
    {"name": "Mr. Jean Mboum",    "email_tag": "jmboum",  "phone_suffix": "13", "relationship": "father"},
]

# parent index → list of student indexes they are linked to
LINKS = {0: [0, 1], 1: [2, 3], 2: [4, 5]}


def run(stdout, schools: dict):
    from apps.users.models import User, UserRole
    from apps.students.models import Student, ParentStudentLink

    result = {}  # school_id -> {"students": [...], "parents": [...]}

    for school_id, school in schools.items():
        sid_prefix = school_id.replace("-", "")[:10]
        students = []
        parents = []

        # ── Students ──────────────────────────────────────────────────────────
        for idx, sr in enumerate(STUDENT_ROSTER, start=1):
            matricule = f"{school.id}-STU-{idx:03d}"
            email = f"student{idx}@{sid_prefix.lower()}.edu.cm"
            full_name = f"{sr['first']} {sr['last']}"

            user, created = User.objects.get_or_create(
                matricule=matricule,
                defaults={
                    "name": full_name,
                    "email": email,
                    "role": UserRole.STUDENT,
                    "school": school,
                    "phone": f"+23767{school_id[-3:]}0{idx:03d}",
                    "is_active": True,
                    "avatar": generate_placeholder_avatar(full_name),
                },
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()

            adm_number = f"ADM-{sid_prefix[:6].upper()}-{idx:04d}"
            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    "school": school,
                    "student_class": f"{sr['level'].replace('_', ' ').title()} {sr['section'].title()}",
                    "class_level": sr["level"],
                    "section": sr["section"],
                    "date_of_birth": sr["dob"],
                    "gender": sr["gender"],
                    "guardian_name": PARENT_ROSTER[idx % 3]["name"],
                    "guardian_phone": f"+23767{school_id[-3:]}9{idx:03d}",
                    "admission_number": adm_number,
                    "admission_date": date(2023, 9, 5),
                },
            )

            # Generate QR code if missing
            if not student.qr_code:
                try:
                    student.generate_qr_code()
                except Exception:
                    pass

            if created:
                stdout.write(f"  [+] Student {matricule} – {full_name}")
            else:
                stdout.write(f"  [=] Exists: {matricule}")

            students.append(student)

        # ── Parents ───────────────────────────────────────────────────────────
        for idx, pr in enumerate(PARENT_ROSTER):
            matricule = f"{school.id}-PAR-{idx+1:03d}"
            email = f"{pr['email_tag']}@{sid_prefix.lower()}.parent.cm"

            user, created = User.objects.get_or_create(
                matricule=matricule,
                defaults={
                    "name": pr["name"],
                    "email": email,
                    "role": UserRole.PARENT,
                    "school": school,
                    "phone": f"+2376700{pr['phone_suffix']}{idx:03d}",
                    "is_active": True,
                    "avatar": generate_placeholder_avatar(pr["name"]),
                },
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
                stdout.write(f"  [+] Parent {matricule} – {pr['name']}")
            else:
                stdout.write(f"  [=] Exists: {matricule}")

            parents.append(user)

        # ── ParentStudentLinks ────────────────────────────────────────────────
        for parent_idx, student_indices in LINKS.items():
            parent_user = parents[parent_idx]
            for i, stu_idx in enumerate(student_indices):
                if stu_idx < len(students):
                    student = students[stu_idx]
                    _, link_created = ParentStudentLink.objects.get_or_create(
                        parent=parent_user,
                        student=student,
                        defaults={
                            "relationship": PARENT_ROSTER[parent_idx]["relationship"],
                            "is_primary": (i == 0),
                        },
                    )
                    if link_created:
                        stdout.write(
                            f"  [+] Link: {parent_user.name} -> {student.user.name}"
                        )

        # Update cached student count
        school.update_student_count()
        result[school_id] = {"students": students, "parents": parents}

    stdout.write(f"  Done: students & parents created for {len(schools)} schools.")
    return result
