"""
Management command: setup_production_data

Orchestrates all 8 seed helpers to populate a fresh EduIgnite database with:
  - All 13 user roles with real accounts
  - 2 demo schools with settings
  - Full staff hierarchy per school
  - Students, parents and ParentStudentLinks
  - Subjects, sequences, grades, term/annual results with ranks
  - Attendance sessions and records
  - Fee structures, payments and invoices
  - Library books and loans
  - Announcements targeted to each role
  - Chat conversations (DMs + group chats) across all roles
  - AI requests and insights
  - Community blogs and testimonials
  - Feedback with responses
  - Staff remarks
  - Live classes with enrollments
  - Orders / leads
  - Platform settings and public events

Usage:
    python manage.py setup_production_data
    python manage.py setup_production_data --flush   # wipe seed data first

All accounts share the password:  EduIgnite@2026!
"""
import traceback
from django.core.management.base import BaseCommand
from django.db import transaction

from .seed_helpers import (
    s01_platform_users,
    s02_schools,
    s03_school_staff,
    s04_students_parents,
    s05_academic,
    s06_attendance_fees_library,
    s07_communication,
    s08_platform_extras,
)


class Command(BaseCommand):
    help = "Seed the database with production-ready demo data for all user roles and features."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            default=False,
            help="Delete existing seed data before re-seeding (use with caution).",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 64))
        self.stdout.write(self.style.SUCCESS("  EduIgnite – Production Data Setup"))
        self.stdout.write(self.style.SUCCESS("=" * 64))

        if options["flush"]:
            self._flush_seed_data()

        steps = [
            ("01 – Platform executive users & FounderProfiles", self._step01),
            ("02 – Schools & SchoolSettings",                   self._step02),
            ("03 – School staff",                               self._step03),
            ("04 – Students, Parents & links",                  self._step04),
            ("05 – Subjects, Sequences, Grades & Results",      self._step05),
            ("06 – Attendance, Fees & Library",                 self._step06),
            ("07 – Announcements & Chat",                       self._step07),
            ("08 – Platform extras (AI, Community, Events…)",   self._step08),
        ]

        for label, fn in steps:
            self.stdout.write(self.style.WARNING(f"\n[STEP] {label}"))
            try:
                with transaction.atomic():
                    fn()
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f"  ERROR in {label}: {exc}"))
                self.stderr.write(traceback.format_exc())
                # Continue with remaining steps rather than aborting all

        self._print_summary()

    # ── Step runners ──────────────────────────────────────────────────────────

    def _step01(self):
        self._exec_users = s01_platform_users.run(self.stdout)

    def _step02(self):
        self._schools = s02_schools.run(self.stdout, self._exec_users)

    def _step03(self):
        self._staff_map = s03_school_staff.run(self.stdout, self._schools)

    def _step04(self):
        self._school_students = s04_students_parents.run(self.stdout, self._schools)

    def _step05(self):
        s05_academic.run(
            self.stdout, self._schools, self._staff_map, self._school_students
        )

    def _step06(self):
        s06_attendance_fees_library.run(
            self.stdout, self._schools, self._staff_map, self._school_students
        )

    def _step07(self):
        s07_communication.run(
            self.stdout,
            self._schools,
            self._exec_users,
            self._staff_map,
            self._school_students,
        )

    def _step08(self):
        s08_platform_extras.run(
            self.stdout,
            self._schools,
            self._exec_users,
            self._staff_map,
            self._school_students,
        )

    # ── Flush helper ─────────────────────────────────────────────────────────

    def _flush_seed_data(self):
        self.stdout.write(self.style.ERROR("  [FLUSH] Removing existing seed accounts..."))
        from apps.users.models import User
        seed_patterns = [
            "EI-SUPER-", "EI-CEO-", "EI-CTO-", "EI-COO-", "EI-INV-", "EI-DES-",
            "GBHS-DOUALA-001-", "PSS-YAOUNDE-001-",
        ]
        for pat in seed_patterns:
            deleted, _ = User.objects.filter(matricule__startswith=pat).delete()
            if deleted:
                self.stdout.write(f"  Deleted {deleted} users matching '{pat}*'")

        from apps.schools.models import School
        for sid in ["GBHS-DOUALA-001", "PSS-YAOUNDE-001"]:
            School.objects.filter(id=sid).delete()
        self.stdout.write("  Flush complete.\n")

    # ── Summary ──────────────────────────────────────────────────────────────

    def _print_summary(self):
        from apps.users.models import User
        from apps.schools.models import School
        from apps.students.models import Student, ParentStudentLink
        from apps.chat.models import Conversation, Message
        from apps.grades.models import Grade
        from apps.fees.models import Payment
        from apps.library.models import BookLoan

        self.stdout.write(self.style.SUCCESS("\n" + "=" * 64))
        self.stdout.write(self.style.SUCCESS("  Setup Complete – Summary"))
        self.stdout.write(self.style.SUCCESS("=" * 64))

        rows = [
            ("Users (total)",          User.objects.count()),
            ("Schools",                School.objects.count()),
            ("Students",               Student.objects.count()),
            ("Parent–Student links",   ParentStudentLink.objects.count()),
            ("Grades recorded",        Grade.objects.count()),
            ("Payments",               Payment.objects.count()),
            ("Book loans",             BookLoan.objects.count()),
            ("Conversations",          Conversation.objects.count()),
            ("Messages",               Message.objects.count()),
        ]
        for label, count in rows:
            self.stdout.write(f"  {label:<28} {count}")

        self.stdout.write(self.style.SUCCESS("\nDefault password for all accounts:"))
        self.stdout.write(self.style.WARNING("  EduIgnite@2026!\n"))
        self.stdout.write(self.style.SUCCESS("Key login matricules:"))
        accounts = [
            ("Super Admin",     "EI-SUPER-001"),
            ("CEO",             "EI-CEO-001"),
            ("CTO",             "EI-CTO-001"),
            ("School Admin #1", "GBHS-DOUALA-001-ADM-001"),
            ("Teacher #1",      "GBHS-DOUALA-001-TCH-001"),
            ("Student #1",      "GBHS-DOUALA-001-STU-001"),
            ("Parent #1",       "GBHS-DOUALA-001-PAR-001"),
            ("Bursar #1",       "GBHS-DOUALA-001-BUR-001"),
            ("Librarian #1",    "GBHS-DOUALA-001-LIB-001"),
        ]
        for role, mat in accounts:
            self.stdout.write(f"  {role:<20} {mat}")

        self.stdout.write(self.style.SUCCESS("=" * 64 + "\n"))
