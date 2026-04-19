"""
Seed helper – Step 03: School-level staff accounts.

For each school creates: 1 SCHOOL_ADMIN, 1 SUB_ADMIN,
4 TEACHERs, 1 BURSAR, 1 LIBRARIAN.
"""
from core.image_utils import generate_placeholder_avatar

DEFAULT_PASSWORD = "EduIgnite@2026!"


def _make_staff(school, role_tag, number, role, extra_name, phone_seed, stdout):
    from apps.users.models import User

    matricule = f"{school.id}-{role_tag}-{number:03d}"
    email = f"{role_tag.lower()}{number}@{school.id.lower().replace('-', '')}.edu.cm"
    name = f"{extra_name} ({school.short_name})"

    user, created = User.objects.get_or_create(
        matricule=matricule,
        defaults={
            "name": name,
            "email": email,
            "role": role,
            "school": school,
            "phone": f"+2376{phone_seed}{number:05d}",
            "is_active": True,
            "is_license_paid": True,
            "avatar": generate_placeholder_avatar(name),
        },
    )
    if created:
        user.set_password(DEFAULT_PASSWORD)
        user.save()
        stdout.write(f"  [+] {role} {matricule}")
    else:
        stdout.write(f"  [=] Exists: {matricule}")
    return user


def run(stdout, schools: dict):
    from apps.users.models import UserRole
    from apps.schools.models import School

    staff_map = {}  # school_id -> { role -> [users] }

    teacher_subjects = [
        "Mathematics Teacher",
        "English Language Teacher",
        "Biology Teacher",
        "Physics Teacher",
    ]

    for school_id, school in schools.items():
        staff_map[school_id] = {
            "admins": [],
            "sub_admins": [],
            "teachers": [],
            "bursars": [],
            "librarians": [],
        }

        base = int(school_id[-3:]) * 10  # unique phone seed per school

        admin = _make_staff(school, "ADM", 1, UserRole.SCHOOL_ADMIN,
                            "School Administrator", base + 71, stdout)
        # Link as principal_user
        if not school.principal_user:
            school.principal_user = admin
            school.save(update_fields=["principal_user"])
        staff_map[school_id]["admins"].append(admin)

        sub = _make_staff(school, "SUB", 1, UserRole.SUB_ADMIN,
                          "Deputy Administrator", base + 72, stdout)
        staff_map[school_id]["sub_admins"].append(sub)

        for i, subj_name in enumerate(teacher_subjects, start=1):
            t = _make_staff(school, "TCH", i, UserRole.TEACHER,
                            subj_name, base + 73, stdout)
            staff_map[school_id]["teachers"].append(t)

        bursar = _make_staff(school, "BUR", 1, UserRole.BURSAR,
                             "School Bursar", base + 74, stdout)
        staff_map[school_id]["bursars"].append(bursar)

        lib = _make_staff(school, "LIB", 1, UserRole.LIBRARIAN,
                          "School Librarian", base + 75, stdout)
        staff_map[school_id]["librarians"].append(lib)

        # Update cached teacher count
        school.update_teacher_count()

    stdout.write(f"  Done: staff accounts created for {len(schools)} schools.")
    return staff_map
