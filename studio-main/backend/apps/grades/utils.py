from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Avg, Q, Count
from .models import Grade, TermResult, AnnualResult, Sequence


def calculate_sequence_average(student, sequence):
    """Calculate weighted average for a student in a sequence"""
    grades = Grade.objects.filter(student=student, sequence=sequence).select_related('subject')

    if not grades.exists():
        return Decimal('0.00')

    total_weighted = Decimal('0.00')
    total_coefficient = Decimal('0.00')

    for grade in grades:
        coefficient = Decimal(str(grade.subject.coefficient))
        score = Decimal(str(grade.score))
        total_weighted += score * coefficient
        total_coefficient += coefficient

    if total_coefficient == 0:
        return Decimal('0.00')

    average = total_weighted / total_coefficient
    return average.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_term_average(student, term, academic_year):
    """Calculate term average from all sequences in a term"""
    sequences = Sequence.objects.filter(
        school=student.school,
        term=term,
        academic_year=academic_year
    )

    averages = []
    for sequence in sequences:
        avg = calculate_sequence_average(student, sequence)
        if avg > 0:
            averages.append(avg)

    if not averages:
        return Decimal('0.00')

    total = sum(averages)
    term_avg = total / len(averages)
    return term_avg.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_annual_average(student, academic_year):
    """Calculate annual average from all term averages"""
    term_results = TermResult.objects.filter(
        student=student,
        academic_year=academic_year
    ).exclude(average=Decimal('0.00'))

    if not term_results.exists():
        return Decimal('0.00')

    total = sum([Decimal(str(tr.average)) for tr in term_results])
    count = term_results.count()

    annual_avg = total / count
    return annual_avg.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def compute_rank(student, sequence):
    """Compute rank in class for a sequence"""
    student_average = calculate_sequence_average(student, sequence)

    if student_average == 0:
        return None

    rank = Grade.objects.filter(
        student__school=student.school,
        student__class_level=student.class_level,
        sequence=sequence
    ).values('student').annotate(
        avg=Avg('score')
    ).filter(avg__gt=float(student_average)).count()

    return rank + 1


def get_grade_letter(score):
    """Convert numerical score to letter grade (Cameroon scale 0-20)"""
    score = float(score)
    if score >= 16:
        return 'A'
    elif score >= 14:
        return 'B'
    elif score >= 12:
        return 'C'
    elif score >= 10:
        return 'D'
    else:
        return 'F'


def generate_report_card_data(student, sequence):
    """Generate complete report card data for a student in a sequence"""
    grades = Grade.objects.filter(student=student, sequence=sequence).select_related('subject')

    grades_data = []
    total_score = Decimal('0.00')
    total_coefficient = Decimal('0.00')

    for grade in grades:
        coefficient = Decimal(str(grade.subject.coefficient))
        score = Decimal(str(grade.score))
        total_score += score * coefficient
        total_coefficient += coefficient

        grades_data.append({
            'subject_name': grade.subject.name,
            'subject_code': grade.subject.code,
            'score': float(grade.score),
            'grade_letter': grade.get_grade_letter(),
            'coefficient': float(grade.subject.coefficient),
            'comment': grade.comment
        })

    average = Decimal('0.00')
    if total_coefficient > 0:
        average = (total_score / total_coefficient).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    rank = compute_rank(student, sequence)

    total_students = Grade.objects.filter(
        student__school=student.school,
        student__class_level=student.class_level,
        sequence=sequence
    ).values('student').distinct().count()

    return {
        'student': {
            'name': student.user.get_full_name(),
            'admission_number': student.admission_number,
            'class': student.student_class,
            'level': student.class_level,
        },
        'sequence': {
            'name': sequence.name,
            'academic_year': sequence.academic_year,
            'term': sequence.term,
        },
        'grades': grades_data,
        'average': float(average),
        'rank': rank,
        'total_students': total_students,
        'promotion_status': 'Promoted' if average >= 10 else 'Requires Review',
    }
