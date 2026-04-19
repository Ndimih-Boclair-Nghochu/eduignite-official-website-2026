"""
Seed helper – Step 06: Attendance records, Fee structures + Payments, Library books + loans.
"""
from datetime import date, timedelta
from decimal import Decimal
import random

random.seed(99)


# ─── Attendance ───────────────────────────────────────────────────────────────

def _seed_attendance(school, staff_map, school_students, stdout):
    from apps.attendance.models import AttendanceSession, AttendanceRecord

    teachers = staff_map["teachers"]
    students = school_students["students"]

    session_date = date(2025, 9, 10)
    for day_offset in range(5):
        d = session_date + timedelta(days=day_offset)
        teacher = teachers[day_offset % len(teachers)]
        session, created = AttendanceSession.objects.get_or_create(
            school=school,
            teacher=teacher,
            student_class="Form 5 Science",
            date=d,
            period="morning",
            defaults={"subject": None, "notes": ""},
        )
        if created:
            stdout.write(f"  [+] Attendance session {school.id} {d}")
        for student in students:
            status = random.choice(["present", "present", "present", "absent", "late"])
            AttendanceRecord.objects.get_or_create(
                session=session,
                student=student,
                defaults={
                    "status": status,
                    "excuse_note": "Medical" if status == "absent" else "",
                    "notified_parent": status == "absent",
                },
            )


# ─── Fees ─────────────────────────────────────────────────────────────────────

def _seed_fees(school, staff_map, school_students, stdout):
    from apps.fees.models import FeeStructure, Payment, Invoice
    from apps.users.models import UserRole

    bursar = staff_map["bursars"][0]
    students = school_students["students"]
    parents = school_students["parents"]

    structures = [
        {"name": "School Fees 2025-2026", "role": "STUDENT", "amount": Decimal("45000")},
        {"name": "PTA Levy 2025-2026",    "role": "STUDENT", "amount": Decimal("5000")},
        {"name": "Lab Fee 2025-2026",     "role": "STUDENT", "amount": Decimal("10000")},
    ]

    fee_objects = []
    for fs_data in structures:
        fs, created = FeeStructure.objects.get_or_create(
            school=school,
            name=fs_data["name"],
            academic_year="2025-2026",
            defaults={
                "role": fs_data["role"],
                "amount": fs_data["amount"],
                "currency": "XAF",
                "due_date": date(2025, 10, 31),
                "is_mandatory": True,
                "description": fs_data["name"],
            },
        )
        if created:
            stdout.write(f"  [+] FeeStructure: {school.id} {fs.name}")
        fee_objects.append(fs)

    # Create payments: first 4 students paid school fees
    for idx, student in enumerate(students[:4]):
        payer = parents[idx % len(parents)] if parents else student.user
        payment, created = Payment.objects.get_or_create(
            school=school,
            payer=payer,
            fee_structure=fee_objects[0],
            defaults={
                "bursar": bursar,
                "amount": fee_objects[0].amount,
                "currency": "XAF",
                "payment_method": random.choice(["cash", "mobile_money", "bank_transfer"]),
                "status": "confirmed",
                "payment_date": date(2025, 9, 15),
                "notes": "Full payment for 2025-2026",
            },
        )
        if created:
            Invoice.objects.get_or_create(
                payment=payment,
                defaults={"issued_by": bursar},
            )
            stdout.write(f"  [+] Payment + Invoice: {payer.name} for {fee_objects[0].name}")


# ─── Library ──────────────────────────────────────────────────────────────────

def _seed_library(school, staff_map, school_students, stdout):
    from apps.library.models import BookCategory, Book, BookLoan

    librarian = staff_map["librarians"][0]
    students = school_students["students"]

    cats = {}
    for cat_name in ["Sciences", "Literature", "Mathematics", "History", "Technology"]:
        cat, _ = BookCategory.objects.get_or_create(
            school=school, name=cat_name,
            defaults={"color": "#3498db"},
        )
        cats[cat_name] = cat

    books_data = [
        {"title": "Advanced Mathematics",       "author": "J.K. Backhouse",   "isbn": None,           "cat": "Mathematics",  "copies": 10},
        {"title": "New Oxford English Course",  "author": "H. Moorwood",      "isbn": None,           "cat": "Literature",   "copies": 8},
        {"title": "Biology for WAEC",           "author": "Idodo Umeh",       "isbn": None,           "cat": "Sciences",     "copies": 6},
        {"title": "Physics in Action",          "author": "Keith Gibbs",      "isbn": None,           "cat": "Sciences",     "copies": 5},
        {"title": "History of Cameroon",        "author": "Victor Julius Ngoh","isbn": None,          "cat": "History",      "copies": 7},
        {"title": "Introduction to Computing",  "author": "P.M. Heathcote",   "isbn": None,           "cat": "Technology",   "copies": 4},
    ]

    book_objects = []
    for bd in books_data:
        # Use None for isbn to avoid unique constraint conflicts across schools
        book, created = Book.objects.get_or_create(
            school=school,
            title=bd["title"],
            author=bd["author"],
            defaults={
                "category": cats[bd["cat"]],
                "total_copies": bd["copies"],
                "available_copies": bd["copies"] - 1,
                "is_active": True,
                "location": f"Shelf {bd['cat'][0]}-{books_data.index(bd)+1}",
            },
        )
        if created:
            stdout.write(f"  [+] Book: {school.id} '{book.title}'")
        book_objects.append(book)

    # 2 active loans
    for idx, student in enumerate(students[:2]):
        book = book_objects[idx]
        BookLoan.objects.get_or_create(
            school=school,
            book=book,
            borrower=student.user,
            defaults={
                "librarian": librarian,
                "issued_date": date(2025, 9, 12),
                "due_date": date(2025, 9, 26),
                "status": "Active",
            },
        )
        stdout.write(f"  [+] Loan: {student.user.name} borrowed '{book.title}'")


# ─── Entry point ──────────────────────────────────────────────────────────────

def run(stdout, schools, staff_map, school_students):
    for school_id, school in schools.items():
        sm = staff_map[school_id]
        ss = school_students[school_id]
        _seed_attendance(school, sm, ss, stdout)
        _seed_fees(school, sm, ss, stdout)
        _seed_library(school, sm, ss, stdout)

    stdout.write(f"  Done: attendance, fees, library seeded for {len(schools)} schools.")
