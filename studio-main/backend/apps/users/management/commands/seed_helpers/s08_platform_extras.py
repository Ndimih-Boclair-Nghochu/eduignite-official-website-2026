"""
Seed helper – Step 08: Platform settings, AI requests, Community content,
Feedback, Orders, Staff remarks, Live classes.
"""
from django.utils import timezone
from datetime import timedelta, date


# ─── Platform Settings ───────────────────────────────────────────────────────

def _seed_platform(exec_users, stdout):
    from apps.platform.models import PlatformSettings, PlatformFees, PublicEvent

    ps = PlatformSettings.load()
    ps.name = "EduIgnite"
    ps.contact_email = "support@eduignite.com"
    ps.contact_phone = "+237670000000"
    ps.maintenance_mode = False
    ps.honour_roll_threshold = 15
    ps.save()
    stdout.write("  [+] PlatformSettings updated")

    for role, amount in [("STUDENT", 45000), ("TEACHER", 0), ("SCHOOL_ADMIN", 0)]:
        PlatformFees.objects.get_or_create(
            role=role,
            defaults={"amount": amount, "currency": "XAF"},
        )

    events_data = [
        {"type": "news",    "title": "EduIgnite Launches 2026 Platform",
         "description": "The EduIgnite team is proud to announce the 2026 platform release with AI features.", "order": 1},
        {"type": "article", "title": "How AI is Transforming Education in Africa",
         "description": "An in-depth look at how AI-powered tools are improving learning outcomes.", "order": 2},
        {"type": "video",   "title": "Getting Started with EduIgnite",
         "description": "A step-by-step tutorial for school administrators.", "order": 3},
    ]
    for ed in events_data:
        PublicEvent.objects.get_or_create(
            title=ed["title"],
            defaults={
                "type": ed["type"],
                "description": ed["description"],
                "is_active": True,
                "order": ed["order"],
            },
        )
    stdout.write("  [+] PublicEvents created")


# ─── Community ────────────────────────────────────────────────────────────────

def _seed_community(exec_users, school_students, stdout):
    from apps.community.models import Testimony, CommunityBlog, BlogComment

    ceo = next((u for u in exec_users.values() if u.role == "CEO"), None)
    some_users = list(exec_users.values())[:3]

    testimonials = [
        ("EduIgnite transformed how we manage our school. The AI feedback is incredible!", "School Principal, Douala"),
        ("As a parent, I now get real-time updates about my child's attendance and grades.", "Parent, Yaounde"),
        ("The library system alone saved us hours of manual work every week.", "School Librarian, Bamenda"),
    ]
    for i, (msg, role_disp) in enumerate(testimonials):
        user = some_users[i % len(some_users)]
        t, created = Testimony.objects.get_or_create(
            user=user,
            message=msg[:50],
            defaults={
                "school_name": "Demo School",
                "role_display": role_disp,
                "message": msg,
                "status": "approved",
                "approved_by": ceo,
                "approved_at": timezone.now(),
            },
        )
        if created:
            stdout.write(f"  [+] Testimony: {user.name}")

    if ceo:
        blog, created = CommunityBlog.objects.get_or_create(
            title="Welcome to EduIgnite Blog",
            author=ceo,
            defaults={
                "paragraphs": [
                    {"heading": "Introduction", "body": "EduIgnite is built for Africa's educational future."},
                    {"heading": "Our Mission",  "body": "Empowering schools with technology and data-driven insights."},
                    {"heading": "2026 Vision",  "body": "Reaching 1,000 schools across Cameroon and West Africa."},
                ],
                "is_published": True,
                "published_at": timezone.now(),
            },
        )
        if created:
            stdout.write("  [+] CommunityBlog created")
            # Add a comment from another exec
            cto = next((u for u in exec_users.values() if u.role == "CTO"), None)
            if cto:
                BlogComment.objects.get_or_create(
                    blog=blog,
                    author=cto,
                    defaults={"content": "Proud to be part of this journey!", "is_approved": True},
                )


# ─── AI Requests ─────────────────────────────────────────────────────────────

def _seed_ai(schools, staff_map, school_students, stdout):
    from apps.ai_features.models import AIRequest, AIInsight

    for school_id, school in schools.items():
        teacher = staff_map[school_id]["teachers"][0]
        students = school_students[school_id]["students"]

        # Teacher AI request
        req, created = AIRequest.objects.get_or_create(
            user=teacher,
            request_type="grade_analysis",
            defaults={
                "school": school,
                "prompt": "Analyse the performance of Form 5 Science class for Sequence 1.",
                "response": (
                    "Based on the grade data, Form 5 Science shows an average of 13.4/20. "
                    "Mathematics (avg 14.2) and Biology (avg 12.8) are the strongest subjects. "
                    "English (avg 11.1) needs attention. Recommend targeted revision sessions."
                ),
                "model_used": "llama-3.3-70b-versatile",
                "tokens_used": 320,
                "status": "completed",
                "processing_time_ms": 1240,
            },
        )
        if created:
            stdout.write(f"  [+] AIRequest for {teacher.name}")

        # Student AI request
        if students:
            AIRequest.objects.get_or_create(
                user=students[0].user,
                request_type="study_plan",
                defaults={
                    "school": school,
                    "prompt": "Create a study plan for my upcoming Mathematics exam.",
                    "response": (
                        "Week 1: Algebra fundamentals (2hr/day). "
                        "Week 2: Trigonometry & Coordinate Geometry (2hr/day). "
                        "Week 3: Past paper practice & timed tests. "
                        "Focus on Chapters 3-6. Use flashcards for formulae."
                    ),
                    "model_used": "llama-3.3-70b-versatile",
                    "tokens_used": 280,
                    "status": "completed",
                    "processing_time_ms": 980,
                },
            )

        # AI Insight
        AIInsight.objects.get_or_create(
            school=school,
            insight_type="weekly_performance",
            title="Week 3 Performance Summary",
            defaults={
                "description": "Class average improved by 0.8 points this week. Attendance up 5%.",
                "data": {"avg_score": 13.4, "attendance_rate": 0.92, "improvement": 0.8},
                "target_role": "TEACHER,SCHOOL_ADMIN",
                "expires_at": timezone.now() + timedelta(days=7),
                "is_active": True,
            },
        )


# ─── Feedback ─────────────────────────────────────────────────────────────────

def _seed_feedback(schools, staff_map, school_students, stdout):
    from apps.feedback.models import Feedback, FeedbackResponse

    for school_id, school in schools.items():
        admin = staff_map[school_id]["admins"][0]
        teacher = staff_map[school_id]["teachers"][0]

        fb, created = Feedback.objects.get_or_create(
            school=school,
            sender=teacher,
            subject="Suggestion: Weekly Grade Summary Email",
            defaults={
                "message": (
                    "It would be very helpful if the system could send teachers "
                    "a weekly summary of class grades by email every Friday evening."
                ),
                "status": "In_Progress",
                "priority": "Medium",
            },
        )
        if created:
            stdout.write(f"  [+] Feedback from {teacher.name}")
            FeedbackResponse.objects.create(
                feedback=fb,
                responder=admin,
                message="Great suggestion! We have added this to the development roadmap for Q2.",
            )


# ─── Staff Remarks ────────────────────────────────────────────────────────────

def _seed_remarks(schools, staff_map, stdout):
    from apps.staff_remarks.models import StaffRemark

    for school_id, school in schools.items():
        admin = staff_map[school_id]["admins"][0]
        teacher = staff_map[school_id]["teachers"][0]

        StaffRemark.objects.get_or_create(
            staff=teacher,
            admin=admin,
            school=school,
            text="Consistently prepares detailed lesson plans and maintains excellent student engagement.",
            defaults={
                "remark_type": "Commendation",
                "is_confidential": False,
            },
        )
        stdout.write(f"  [+] StaffRemark for {teacher.name}")


# ─── Live Classes ─────────────────────────────────────────────────────────────

def _seed_live_classes(schools, staff_map, school_students, stdout):
    from apps.live_classes.models import LiveClass, LiveClassEnrollment
    from apps.grades.models import Subject

    for school_id, school in schools.items():
        teacher = staff_map[school_id]["teachers"][0]
        students = school_students[school_id]["students"]
        subj = Subject.objects.filter(school=school, code="MATH").first()

        lc, created = LiveClass.objects.get_or_create(
            school=school,
            title="Mathematics – Algebra Review",
            teacher=teacher,
            defaults={
                "description": "Live revision of Chapters 3 & 4 before the Sequence 1 exam.",
                "subject": subj,
                "subject_name": "Mathematics",
                "target_class": "Form 5 Science",
                "meeting_url": "https://meet.jit.si/eduignite-math-review",
                "meeting_id": f"EDU-MATH-{school_id[-3:]}",
                "platform": "jitsi",
                "start_time": timezone.now() + timedelta(days=2),
                "duration_minutes": 90,
                "status": "upcoming",
                "max_participants": 40,
            },
        )
        if created:
            stdout.write(f"  [+] LiveClass: {school_id} {lc.title}")
            for student in students[:4]:
                LiveClassEnrollment.objects.get_or_create(
                    live_class=lc, student=student.user,
                )


# ─── Orders (Lead capture) ────────────────────────────────────────────────────

def _seed_orders(stdout):
    from apps.orders.models import Order

    orders_data = [
        {
            "full_name": "Principal Ngufor Bertrand",
            "occupation": "School Principal",
            "school_name": "Sacred Heart College Bamenda",
            "whatsapp_number": "+237677123456",
            "email": "ngufor.bertrand@shc.cm",
            "region": "Northwest",
            "division": "Mezam",
            "sub_division": "Bamenda",
            "message": "We need a complete school management system for 1200 students.",
            "status": "pending",
        },
        {
            "full_name": "Dr. Ambe Christine",
            "occupation": "Director of Education",
            "school_name": "Comprehensive College Buea",
            "whatsapp_number": "+237699987654",
            "email": "ambe.c@ccbuea.cm",
            "region": "Southwest",
            "division": "Fako",
            "sub_division": "Buea",
            "message": "Interested in the full EduIgnite package for 3 schools.",
            "status": "contacted",
        },
    ]
    for od in orders_data:
        Order.objects.get_or_create(
            email=od["email"],
            defaults=od,
        )
    stdout.write(f"  [+] {len(orders_data)} demo orders/leads created")


# ─── Entry point ─────────────────────────────────────────────────────────────

def run(stdout, schools, exec_users, staff_map, school_students):
    _seed_platform(exec_users, stdout)
    _seed_community(exec_users, school_students, stdout)
    _seed_ai(schools, staff_map, school_students, stdout)
    _seed_feedback(schools, staff_map, school_students, stdout)
    _seed_remarks(schools, staff_map, stdout)
    _seed_live_classes(schools, staff_map, school_students, stdout)
    _seed_orders(stdout)
    stdout.write(f"  Done: platform extras seeded.")
