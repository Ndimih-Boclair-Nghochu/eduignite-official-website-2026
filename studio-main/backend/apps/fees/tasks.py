from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from datetime import timedelta
from decimal import Decimal
from .models import Payment, FeeStructure
from django.contrib.auth import get_user_model

User = get_user_model()


@shared_task
def send_payment_reminders():
    """Notify users with outstanding fees"""
    today = timezone.now().date()

    # Get all fee structures with due dates
    fee_structures = FeeStructure.objects.filter(
        due_date__isnull=False,
        due_date__lte=today + timedelta(days=7)  # Due within next 7 days
    )

    for fee in fee_structures:
        # Get users who should pay this fee but haven't
        users = User.objects.filter(school=fee.school, role=fee.role)

        for user in users:
            # Check if user has already paid this fee
            has_paid = Payment.objects.filter(
                payer=user,
                fee_structure=fee,
                status='confirmed'
            ).exists()

            if not has_paid:
                try:
                    subject = f"Payment Reminder: {fee.name}"
                    context = {
                        'user_name': user.get_full_name(),
                        'fee_name': fee.name,
                        'amount': fee.amount,
                        'currency': fee.currency,
                        'due_date': fee.due_date,
                        'days_remaining': (fee.due_date - today).days,
                    }
                    message = render_to_string('payment_reminder.html', context)

                    send_mail(
                        subject,
                        message,
                        'EduIgnite <eduignitecmr@gmail.com>',
                        [user.email],
                        html_message=message,
                        fail_silently=True,
                    )

                except Exception as e:
                    print(f"Error sending reminder to {user.email}: {str(e)}")
                    continue


@shared_task
def generate_monthly_revenue_report():
    """Generate monthly revenue summary"""
    from apps.schools.models import School

    today = timezone.now().date()
    month_start = today.replace(day=1)

    schools = School.objects.all()

    for school in schools:
        payments = Payment.objects.filter(
            school=school,
            status='confirmed',
            payment_date__gte=month_start,
            payment_date__lte=today
        )

        if not payments.exists():
            continue

        total_revenue = payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # By method
        method_breakdown = {}
        for method, _ in Payment.PAYMENT_METHOD_CHOICES:
            amount = payments.filter(payment_method=method).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            if amount > 0:
                method_breakdown[method] = amount

        # By fee type
        fee_breakdown = {}
        for fee in payments.values('fee_structure__name').annotate(total=Sum('amount')):
            if fee['fee_structure__name']:
                fee_breakdown[fee['fee_structure__name']] = fee['total']

        report_data = {
            'school': school.name,
            'period': f"{month_start.strftime('%B %Y')}",
            'total_revenue': total_revenue,
            'payment_count': payments.count(),
            'by_method': method_breakdown,
            'by_fee_type': fee_breakdown,
        }

        # Store or send report
        # This can be extended to save to a report model or send email to bursars

    return f"Monthly revenue report generated for {schools.count()} schools"


from django.db.models import Sum
