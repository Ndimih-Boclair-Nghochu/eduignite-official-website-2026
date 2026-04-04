"""
Management command to seed the database with demo accounts for EduIgnite.

Creates:
  - Platform settings initialized (name, contact email)
  - 1 demo school (GBHS Deido)
  - 15 demo users across all roles
  - 5 demo subjects with teacher assignments
  - 2 demo sequences (Seq 1 & Seq 2, academic year 2025-2026)
  - 3 student profiles linked to demo student users
  - Sample grades for each student across all subjects
  - 6 sample live class sessions (live, upcoming, ended)

Usage:
    python manage.py seed_demo
    python manage.py seed_demo --reset   # Drop existing demo data first
"""

import datetime
from decimal import Decimal
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.users.models import User, UserRole
from apps.schools.models import School


# ─── Demo School ─────────────────────────────────────────────────────
DEMO_SCHOOL = {
    "name": "Government Bilingual High School, Deido",
    "short_name": "GBHS Deido",
    "principal": "Dr. Emmanuel Mbah",
    "motto": "Excellence Through Knowledge",
    "description": "A leading bilingual secondary school in Douala, Cameroon.",
    "location": "Deido, Douala",
    "region": "Littoral",
    "division": "Wouri",
    "sub_division": "Douala III",
    "city_village": "Douala",
    "address": "BP 1234, Deido, Douala",
    "phone": "+237 233 40 12 34",
    "email": "info@gbhsdeido.cm",
    "status": "Active",
}

# ─── Demo Users ───────────────────────────────────────────────────────
DEMO_USERS = [
    # Platform Executives (no school)
    dict(matricule="EDUI26CEO001", name="Alex Moukouri",       email="ceo@eduignite.cm",
         role=UserRole.CEO,      password="EduIgnite@2026", phone="+237699000001",
         is_license_paid=True, school=None),
    dict(matricule="EDUI26CTO001", name="Sandra Nkemdirim",    email="cto@eduignite.cm",
         role=UserRole.CTO,      password="EduIgnite@2026", phone="+237699000002",
         is_license_paid=True, school=None),
    dict(matricule="EDUI26COO001", name="Maurice Bello",       email="coo@eduignite.cm",
         role=UserRole.COO,      password="EduIgnite@2026", phone="+237699000003",
         is_license_paid=True, school=None),
    dict(matricule="EDUI26INV001", name="Jean-Pierre Ondoua",  email="investor@eduignite.cm",
         role=UserRole.INV,      password="EduIgnite@2026", phone="+237699000004",
         is_license_paid=True, school=None),
    # School Admins
    dict(matricule="GBHS26ADM001", name="Mme. Brigitte Ateba", email="admin@gbhsdeido.cm",
         role=UserRole.SCHOOL_ADMIN, password="Admin@2026", phone="+237677102030",
         is_license_paid=True, school="GBHS Deido"),
    dict(matricule="GBHS26SUB001", name="M. Paul Fotso",       email="subadmin@gbhsdeido.cm",
         role=UserRole.SUB_ADMIN,   password="Admin@2026",  phone="+237677102031",
         is_license_paid=True, school="GBHS Deido"),
    # Teachers
    dict(matricule="GBHS26T001", name="Dr. Aris Tesla",        email="tesla@gbhsdeido.cm",
         role=UserRole.TEACHER,  password="Teacher@2026",   phone="+237677203040",
         is_license_paid=True, school="GBHS Deido"),
    dict(matricule="GBHS26T002", name="Prof. Sarah Smith",     email="smith@gbhsdeido.cm",
         role=UserRole.TEACHER,  password="Teacher@2026",   phone="+237677203041",
         is_license_paid=True, school="GBHS Deido"),
    dict(matricule="GBHS26T003", name="Ms. Bennet",            email="bennet@gbhsdeido.cm",
         role=UserRole.TEACHER,  password="Teacher@2026",   phone="+237677203042",
         is_license_paid=True, school="GBHS Deido"),
    # Students
    dict(matricule="GBHS26S001", name="Alice Thompson",        email="alice@gbhsdeido.cm",
         role=UserRole.STUDENT,  password="Student@2026",   phone="+237655304050",
         is_license_paid=True, school="GBHS Deido", annual_avg=Decimal("16.45")),
    dict(matricule="GBHS26S002", name="Bob Richards",          email="bob@gbhsdeido.cm",
         role=UserRole.STUDENT,  password="Student@2026",   phone="+237655304051",
         is_license_paid=True, school="GBHS Deido", annual_avg=Decimal("14.20")),
    dict(matricule="GBHS26S003", name="Charlie Davis",         email="charlie@gbhsdeido.cm",
         role=UserRole.STUDENT,  password="Student@2026",   phone="+237655304052",
         is_license_paid=True, school="GBHS Deido", annual_avg=Decimal("12.80")),
    # Parent
    dict(matricule="GBHS26P001", name="Mr. Robert Thompson",   email="parent@gbhsdeido.cm",
         role=UserRole.PARENT,   password="Parent@2026",    phone="+237677405060",
         is_license_paid=True, school="GBHS Deido"),
    # Bursar
    dict(matricule="GBHS26BRS001", name="Mme. Claire Ngo",     email="bursar@gbhsdeido.cm",
         role=UserRole.BURSAR,   password="Bursar@2026",    phone="+237677506070",
         is_license_paid=True, school="GBHS Deido"),
    # Librarian
    dict(matricule="GBHS26LIB001", name="M. Daniel Ewane",     email="librarian@gbhsdeido.cm",
         role=UserRole.LIBRARIAN, password="Library@2026",  phone="+237677607080",
         is_license_paid=True, school="GBHS Deido"),
]

# ─── Demo Subjects ────────────────────────────────────────────────────
DEMO_SUBJECTS = [
    dict(name="Advanced Physics",    code="PHY301", level="form5",       coefficient=Decimal("4"),  teacher_mat="GBHS26T001"),
    dict(name="Mathematics",          code="MAT301", level="form5",       coefficient=Decimal("5"),  teacher_mat="GBHS26T002"),
    dict(name="English Literature",   code="ENG301", level="form5",       coefficient=Decimal("3"),  teacher_mat="GBHS26T003"),
    dict(name="General Chemistry",    code="CHM301", level="form5",       coefficient=Decimal("4"),  teacher_mat="GBHS26T001"),
    dict(name="History & Geography",  code="HGE301", level="form5",       coefficient=Decimal("2"),  teacher_mat="GBHS26T003"),
]

# ─── Demo Sequences ───────────────────────────────────────────────────
DEMO_SEQUENCES = [
    dict(name="Sequence 1", academic_year="2025-2026", term=1,
         start_date=datetime.date(2025, 10, 1), end_date=datetime.date(2025, 11, 30), is_active=False),
    dict(name="Sequence 2", academic_year="2025-2026", term=1,
         start_date=datetime.date(2026, 1, 15), end_date=datetime.date(2026, 3, 15), is_active=True),
]

# ─── Demo Student Profiles ────────────────────────────────────────────
DEMO_STUDENTS = [
    dict(matricule="GBHS26S001", student_class="Form 5 Science", class_level="form5",
         section="science", date_of_birth=datetime.date(2008, 5, 15), gender="female",
         guardian_name="Mr. Robert Thompson", guardian_phone="+237677405060",
         admission_number="ADM2026001", admission_date=datetime.date(2023, 9, 4),
         annual_average=Decimal("16.45"), is_on_honour_roll=True),
    dict(matricule="GBHS26S002", student_class="Form 5 Arts", class_level="form5",
         section="arts", date_of_birth=datetime.date(2007, 11, 22), gender="male",
         guardian_name="Mrs. Patricia Richards", guardian_phone="+237677405061",
         admission_number="ADM2026002", admission_date=datetime.date(2023, 9, 4),
         annual_average=Decimal("14.20"), is_on_honour_roll=False),
    dict(matricule="GBHS26S003", student_class="Lower Sixth General", class_level="lower_sixth",
         section="general", date_of_birth=datetime.date(2007, 3, 10), gender="male",
         guardian_name="Mr. Thomas Davis", guardian_phone="+237677405062",
         admission_number="ADM2026003", admission_date=datetime.date(2022, 9, 5),
         annual_average=Decimal("12.80"), is_on_honour_roll=False),
]

# ─── Demo Grade Scores [student_mat][subject_code][seq_name] ──────────
DEMO_GRADES = {
    "GBHS26S001": {
        "PHY301": {"Sequence 1": Decimal("14.5"), "Sequence 2": Decimal("16.0")},
        "MAT301": {"Sequence 1": Decimal("18.0"), "Sequence 2": Decimal("17.5")},
        "ENG301": {"Sequence 1": Decimal("12.0"), "Sequence 2": Decimal("14.0")},
        "CHM301": {"Sequence 1": Decimal("13.5"), "Sequence 2": Decimal("15.0")},
        "HGE301": {"Sequence 1": Decimal("16.0"), "Sequence 2": Decimal("17.0")},
    },
    "GBHS26S002": {
        "PHY301": {"Sequence 1": Decimal("11.0"), "Sequence 2": Decimal("13.5")},
        "MAT301": {"Sequence 1": Decimal("14.5"), "Sequence 2": Decimal("15.0")},
        "ENG301": {"Sequence 1": Decimal("16.5"), "Sequence 2": Decimal("15.0")},
        "CHM301": {"Sequence 1": Decimal("10.0"), "Sequence 2": Decimal("12.5")},
        "HGE301": {"Sequence 1": Decimal("14.0"), "Sequence 2": Decimal("15.5")},
    },
    "GBHS26S003": {
        "PHY301": {"Sequence 1": Decimal("09.5"), "Sequence 2": Decimal("11.0")},
        "MAT301": {"Sequence 1": Decimal("13.0"), "Sequence 2": Decimal("12.5")},
        "ENG301": {"Sequence 1": Decimal("11.5"), "Sequence 2": Decimal("13.0")},
        "CHM301": {"Sequence 1": Decimal("08.5"), "Sequence 2": Decimal("10.0")},
        "HGE301": {"Sequence 1": Decimal("12.0"), "Sequence 2": Decimal("14.0")},
    },
}


class Command(BaseCommand):
    help = "Seed the database with EduIgnite demo accounts, school, subjects, sequences, and grades"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing demo data before seeding",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.grades.models import Subject, Sequence, Grade
        from apps.students.models import Student
        from apps.live_classes.models import LiveClass, LiveClassStatus
        from apps.platform.models import PlatformSettings

        # ── 0. Initialize Platform Settings ─────────────────────────
        self.stdout.write("\n[0/6] Initializing platform settings...")
        platform, created_ps = PlatformSettings.objects.update_or_create(
            pk=1,
            defaults={
                'name': 'EduIgnite',
                'contact_email': 'eduignitecmr@gmail.com',
                'honour_roll_threshold': 15.00,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f"  {'✓ Created' if created_ps else '~ Updated'}: {platform.name} — {platform.contact_email}")
        )

        if options["reset"]:
            self.stdout.write(self.style.WARNING("Resetting demo data..."))
            demo_matricules = [u["matricule"] for u in DEMO_USERS]
            # Cascade will handle grades/students
            User.objects.filter(matricule__in=demo_matricules).delete()
            School.objects.filter(short_name="GBHS Deido").delete()
            self.stdout.write(self.style.SUCCESS("Demo data cleared."))

        # ── 1. Create Demo School ────────────────────────────────────
        self.stdout.write("\n[1/6] Creating demo school...")
        school, _ = School.objects.get_or_create(
            short_name=DEMO_SCHOOL["short_name"],
            defaults={k: v for k, v in DEMO_SCHOOL.items() if k != "short_name"},
        )
        self.stdout.write(self.style.SUCCESS(f"  ✓ {school.name}"))

        # ── 2. Create Demo Users ─────────────────────────────────────
        self.stdout.write("\n[2/6] Creating demo users...")
        user_map = {}
        created = 0
        skipped = 0
        for ud in DEMO_USERS:
            ud = dict(ud)  # copy
            password = ud.pop("password")
            school_name = ud.pop("school", None)
            annual_avg = ud.pop("annual_avg", None)

            if User.objects.filter(matricule=ud["matricule"]).exists():
                self.stdout.write(f"  ~ Exists: {ud['matricule']}")
                user_map[ud["matricule"]] = User.objects.get(matricule=ud["matricule"])
                skipped += 1
                continue

            if school_name:
                ud["school"] = school
            if annual_avg is not None:
                ud["annual_avg"] = annual_avg

            user = User.objects.create_user(password=password, **ud)
            user.is_active = True
            user.save()
            user_map[user.matricule] = user
            created += 1
            self.stdout.write(
                self.style.SUCCESS(f"  ✓ {user.role:<15} {user.matricule} ({user.name})")
            )

        self.stdout.write(f"  → {created} created, {skipped} skipped")

        # ── 3. Create Demo Subjects ──────────────────────────────────
        self.stdout.write("\n[3/6] Creating demo subjects...")
        subject_map = {}
        for sd in DEMO_SUBJECTS:
            sd = dict(sd)
            teacher_mat = sd.pop("teacher_mat")
            teacher = user_map.get(teacher_mat)
            subj, created_s = Subject.objects.get_or_create(
                code=sd["code"],
                defaults={**sd, "school": school, "teacher": teacher},
            )
            subject_map[sd["code"]] = subj
            status = "✓" if created_s else "~"
            self.stdout.write(f"  {status} {subj.name} ({subj.code})")

        # ── 4. Create Demo Sequences ─────────────────────────────────
        self.stdout.write("\n[4/6] Creating demo sequences...")
        sequence_map = {}
        for seqd in DEMO_SEQUENCES:
            seq, created_q = Sequence.objects.get_or_create(
                school=school,
                academic_year=seqd["academic_year"],
                term=seqd["term"],
                name=seqd["name"],
                defaults=seqd,
            )
            sequence_map[seqd["name"]] = seq
            status = "✓" if created_q else "~"
            self.stdout.write(
                f"  {status} {seq.name} ({'ACTIVE' if seq.is_active else 'closed'})"
            )

        # ── 5. Create Student Profiles & Grades ──────────────────────
        self.stdout.write("\n[5/6] Creating student profiles and grades...")
        for stud_data in DEMO_STUDENTS:
            stud_data = dict(stud_data)
            mat = stud_data.pop("matricule")
            user = user_map.get(mat)
            if not user:
                self.stdout.write(self.style.WARNING(f"  ! User not found: {mat}"))
                continue

            student, created_st = Student.objects.get_or_create(
                user=user,
                defaults={**stud_data, "school": school},
            )
            status = "✓" if created_st else "~"
            self.stdout.write(f"  {status} Student profile: {user.name}")

            # Create grades
            grade_data = DEMO_GRADES.get(mat, {})
            for subj_code, seq_scores in grade_data.items():
                subj = subject_map.get(subj_code)
                if not subj:
                    continue
                teacher_user = subj.teacher
                for seq_name, score in seq_scores.items():
                    seq = sequence_map.get(seq_name)
                    if not seq:
                        continue
                    Grade.objects.get_or_create(
                        student=student,
                        subject=subj,
                        sequence=seq,
                        defaults={"score": score, "school": school, "teacher": teacher_user},
                    )
            self.stdout.write(f"    → Grades seeded for {user.name}")

        # ── 6. Create Demo Live Classes ───────────────────────────────
        self.stdout.write("\n[6/6] Creating demo live classes...")
        now = timezone.now()

        DEMO_LIVE_CLASSES = [
            # Currently LIVE session
            dict(
                title="Quadratic Equations Deep Dive",
                subject_name="Mathematics",
                teacher_mat="GBHS26T002",
                target_class="Form 5 Science",
                platform="jitsi",
                meeting_url="https://meet.jit.si/GBHS-Deido-Math-Live",
                start_time=now - datetime.timedelta(minutes=30),
                duration_minutes=60,
                status=LiveClassStatus.LIVE,
                max_participants=50,
                enrolled_count=18,
                is_recorded=True,
            ),
            # UPCOMING sessions
            dict(
                title="Newton's Laws of Motion",
                subject_name="Advanced Physics",
                teacher_mat="GBHS26T001",
                target_class="Form 5 Science",
                platform="zoom",
                meeting_url="https://zoom.us/j/123456789",
                start_time=now + datetime.timedelta(hours=2),
                duration_minutes=90,
                status=LiveClassStatus.UPCOMING,
                max_participants=40,
                enrolled_count=22,
                is_recorded=False,
            ),
            dict(
                title="Shakespeare: A Midsummer Night's Dream",
                subject_name="English Literature",
                teacher_mat="GBHS26T003",
                target_class="Form 5 Arts",
                platform="google_meet",
                meeting_url="https://meet.google.com/abc-defg-hij",
                start_time=now + datetime.timedelta(days=1, hours=9),
                duration_minutes=60,
                status=LiveClassStatus.UPCOMING,
                max_participants=35,
                enrolled_count=15,
                is_recorded=False,
            ),
            dict(
                title="Organic Chemistry: Hydrocarbons",
                subject_name="General Chemistry",
                teacher_mat="GBHS26T001",
                target_class="Lower Sixth General",
                platform="jitsi",
                meeting_url="https://meet.jit.si/GBHS-Deido-Chem",
                start_time=now + datetime.timedelta(days=2, hours=14),
                duration_minutes=75,
                status=LiveClassStatus.UPCOMING,
                max_participants=50,
                enrolled_count=12,
                is_recorded=True,
            ),
            # ENDED sessions (with recording)
            dict(
                title="Coordinate Geometry: Introduction",
                subject_name="Mathematics",
                teacher_mat="GBHS26T002",
                target_class="Form 5 Science",
                platform="jitsi",
                meeting_url=None,
                start_time=now - datetime.timedelta(days=3, hours=2),
                duration_minutes=60,
                status=LiveClassStatus.ENDED,
                max_participants=50,
                enrolled_count=30,
                is_recorded=True,
                recording_url="https://meet.jit.si/recording/GBHS-Math-001",
            ),
            dict(
                title="World War II: Causes and Consequences",
                subject_name="History & Geography",
                teacher_mat="GBHS26T003",
                target_class="Form 5 Arts",
                platform="zoom",
                meeting_url=None,
                start_time=now - datetime.timedelta(days=1, hours=10),
                duration_minutes=45,
                status=LiveClassStatus.ENDED,
                max_participants=35,
                enrolled_count=28,
                is_recorded=False,
            ),
        ]

        live_created = 0
        for lcd in DEMO_LIVE_CLASSES:
            lcd = dict(lcd)
            teacher_mat = lcd.pop("teacher_mat")
            teacher = user_map.get(teacher_mat)
            if not teacher:
                self.stdout.write(self.style.WARNING(f"  ! Teacher not found: {teacher_mat}"))
                continue

            recording_url = lcd.pop("recording_url", None)

            obj, created_lc = LiveClass.objects.get_or_create(
                school=school,
                title=lcd["title"],
                teacher=teacher,
                defaults={
                    **lcd,
                    "school": school,
                    "teacher": teacher,
                    "recording_url": recording_url,
                },
            )
            status_icon = "✓" if created_lc else "~"
            self.stdout.write(
                f"  {status_icon} [{obj.status.upper():<10}] {obj.title[:45]}"
            )
            if created_lc:
                live_created += 1

        self.stdout.write(f"  → {live_created} live classes created")

        # ── Summary ──────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write(self.style.SUCCESS("  EduIgnite demo data seeded successfully!"))
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write("")
        self.stdout.write("  Login credentials (matricule / password):")
        self.stdout.write("  ─────────────────────────────────────────")
        self.stdout.write("  CEO:          EDUI26CEO001   / EduIgnite@2026")
        self.stdout.write("  CTO:          EDUI26CTO001   / EduIgnite@2026")
        self.stdout.write("  School Admin: GBHS26ADM001   / Admin@2026")
        self.stdout.write("  Sub Admin:    GBHS26SUB001   / Admin@2026")
        self.stdout.write("  Teacher:      GBHS26T001     / Teacher@2026")
        self.stdout.write("  Student:      GBHS26S001     / Student@2026")
        self.stdout.write("  Parent:       GBHS26P001     / Parent@2026")
        self.stdout.write("  Bursar:       GBHS26BRS001   / Bursar@2026")
        self.stdout.write("  Librarian:    GBHS26LIB001   / Library@2026")
        self.stdout.write("")
        self.stdout.write("  Platform contact: eduignitecmr@gmail.com")
        self.stdout.write("")
        self.stdout.write("  Start backend: cd backend && python manage.py runserver")
