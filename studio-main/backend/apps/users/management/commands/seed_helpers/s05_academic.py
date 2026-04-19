"""
Seed helper – Step 05: Subjects, Sequences, Grades, TermResults, AnnualResults.

Creates a full academic record for each student across all subjects for the
current academic year (2025-2026), covering Term 1 sequences.
"""
from datetime import date
from decimal import Decimal
import random

SUBJECTS_TEMPLATE = [
    {"name": "Mathematics",    "code": "MATH", "coeff": 4.0, "level": "all"},
    {"name": "English",        "code": "ENG",  "coeff": 3.0, "level": "all"},
    {"name": "Biology",        "code": "BIO",  "coeff": 3.0, "level": "science"},
    {"name": "Physics",        "code": "PHY",  "coeff": 3.0, "level": "science"},
    {"name": "Chemistry",      "code": "CHEM", "coeff": 3.0, "level": "science"},
    {"name": "History",        "code": "HIST", "coeff": 2.0, "level": "arts"},
    {"name": "Geography",      "code": "GEO",  "coeff": 2.0, "level": "arts"},
    {"name": "Economics",      "code": "ECON", "coeff": 3.0, "level": "commercial"},
    {"name": "Accounting",     "code": "ACC",  "coeff": 3.0, "level": "commercial"},
    {"name": "Computer Sci.",  "code": "CS",   "coeff": 2.0, "level": "technical"},
    {"name": "French",         "code": "FRE",  "coeff": 2.0, "level": "all"},
    {"name": "Civic Education","code": "CIV",  "coeff": 1.0, "level": "all"},
]

ACADEMIC_YEAR = "2025-2026"


def _score():
    return Decimal(str(round(random.uniform(8.0, 19.5), 2)))


def run(stdout, schools: dict, staff_map: dict, school_students: dict):
    from apps.grades.models import Subject, Sequence, Grade, TermResult, AnnualResult

    random.seed(42)  # reproducible scores

    for school_id, school in schools.items():
        teachers = staff_map[school_id]["teachers"]
        students = school_students[school_id]["students"]

        # ── Subjects ──────────────────────────────────────────────────────────
        subjects = {}
        for i, st in enumerate(SUBJECTS_TEMPLATE):
            subj, created = Subject.objects.get_or_create(
                school=school,
                code=st["code"],
                defaults={
                    "name": st["name"],
                    "level": st["level"],
                    "coefficient": Decimal(str(st["coeff"])),
                    "teacher": teachers[i % len(teachers)],
                    "is_active": True,
                },
            )
            subjects[st["code"]] = subj
            if created:
                stdout.write(f"  [+] Subject {school_id}: {subj.name}")

        # ── Sequences ─────────────────────────────────────────────────────────
        seq_definitions = [
            {"name": "Sequence 1", "term": 1,
             "start": date(2025, 9, 8), "end": date(2025, 10, 17), "active": True},
            {"name": "Sequence 2", "term": 1,
             "start": date(2025, 10, 20), "end": date(2025, 11, 28), "active": False},
            {"name": "Sequence 3", "term": 2,
             "start": date(2026, 1, 12), "end": date(2026, 2, 20), "active": False},
        ]
        sequences = {}
        for sd in seq_definitions:
            seq, created = Sequence.objects.get_or_create(
                school=school,
                academic_year=ACADEMIC_YEAR,
                term=sd["term"],
                name=sd["name"],
                defaults={
                    "start_date": sd["start"],
                    "end_date": sd["end"],
                    "is_active": sd["active"],
                },
            )
            sequences[sd["name"]] = seq
            if created:
                stdout.write(f"  [+] Sequence: {school_id} {seq.name}")

        # ── Grades ────────────────────────────────────────────────────────────
        for student in students:
            section = student.section
            student_subjects = [
                s for code, s in subjects.items()
                if SUBJECTS_TEMPLATE[list(subjects.keys()).index(code)]["level"] in ("all", section)
            ]

            term1_scores = []
            for seq in [sequences["Sequence 1"], sequences["Sequence 2"]]:
                seq_scores = []
                for subj in student_subjects:
                    score = _score()
                    Grade.objects.get_or_create(
                        student=student,
                        subject=subj,
                        sequence=seq,
                        defaults={
                            "school": school,
                            "score": score,
                            "teacher": subj.teacher,
                            "comment": _comment(score),
                        },
                    )
                    seq_scores.append(float(score))
                term1_scores.extend(seq_scores)

            # TermResult (Term 1 average of seq1+seq2)
            if term1_scores:
                term_avg = Decimal(str(round(sum(term1_scores) / len(term1_scores), 2)))
                TermResult.objects.get_or_create(
                    student=student,
                    academic_year=ACADEMIC_YEAR,
                    term=1,
                    defaults={
                        "school": school,
                        "average": term_avg,
                        "rank": None,
                        "total_students": len(students),
                        "is_promoted": term_avg >= Decimal("10.00"),
                        "teacher_comment": _teacher_comment(term_avg),
                    },
                )

            # AnnualResult
            annual_avg = Decimal(str(round(sum(term1_scores) / len(term1_scores), 2))) if term1_scores else Decimal("0")
            AnnualResult.objects.get_or_create(
                student=student,
                academic_year=ACADEMIC_YEAR,
                defaults={
                    "school": school,
                    "annual_average": annual_avg,
                    "is_on_honour_roll": annual_avg >= Decimal("15.00"),
                    "is_promoted": annual_avg >= Decimal("10.00"),
                },
            )

            # Update student honour roll
            student.annual_average = annual_avg
            student.is_on_honour_roll = annual_avg >= Decimal("15.00")
            student.save(update_fields=["annual_average", "is_on_honour_roll"])

        stdout.write(f"  Done: academic data for {len(students)} students in {school_id}")

    # Compute ranks per term/school
    _compute_ranks(schools, stdout)


def _comment(score):
    if score >= 16:
        return "Excellent performance!"
    elif score >= 14:
        return "Very good work."
    elif score >= 12:
        return "Good effort."
    elif score >= 10:
        return "Satisfactory."
    else:
        return "Needs improvement."


def _teacher_comment(avg):
    if avg >= 16:
        return "Outstanding student — keep up the excellent work!"
    elif avg >= 14:
        return "Very capable student showing consistent effort."
    elif avg >= 12:
        return "Good progress this term."
    elif avg >= 10:
        return "Satisfactory performance. More effort needed."
    else:
        return "Student needs additional support and guidance."


def _compute_ranks(schools, stdout):
    from apps.grades.models import TermResult, AnnualResult

    for school_id, school in schools.items():
        # Term ranks
        term_results = list(
            TermResult.objects.filter(school=school, academic_year=ACADEMIC_YEAR, term=1)
            .order_by("-average")
        )
        for rank, tr in enumerate(term_results, start=1):
            tr.rank = rank
            tr.total_students = len(term_results)
        TermResult.objects.bulk_update(term_results, ["rank", "total_students"])

        # Annual ranks
        annual_results = list(
            AnnualResult.objects.filter(school=school, academic_year=ACADEMIC_YEAR)
            .order_by("-annual_average")
        )
        for rank, ar in enumerate(annual_results, start=1):
            ar.rank = rank
        AnnualResult.objects.bulk_update(annual_results, ["rank"])

    stdout.write("  Done: ranks computed.")
