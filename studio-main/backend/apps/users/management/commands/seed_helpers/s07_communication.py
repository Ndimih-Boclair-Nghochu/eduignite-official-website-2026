"""
Seed helper – Step 07: Announcements, Chat Conversations, Messages.

Establishes full communication between every user type so each role
can send/receive messages and view relevant announcements.
"""
from django.utils import timezone
from datetime import timedelta


# ─── Announcements ────────────────────────────────────────────────────────────

def _seed_announcements(schools, exec_users, staff_map, school_students, stdout):
    from apps.announcements.models import Announcement

    ceo = next((u for u in exec_users.values() if u.role == "CEO"), None)
    super_admin = next((u for u in exec_users.values() if u.role == "SUPER_ADMIN"), None)

    # Platform-wide announcement from CEO
    if ceo:
        Announcement.objects.get_or_create(
            title="Welcome to EduIgnite 2026!",
            sender=ceo,
            defaults={
                "school": None,
                "content": (
                    "Dear EduIgnite community, we are proud to launch the 2025-2026 "
                    "academic year with exciting new features including AI-powered feedback, "
                    "real-time attendance, and a fully integrated library system. "
                    "Let's make this the best year yet!"
                ),
                "target": "ALL",
                "is_pinned": True,
                "expires_at": timezone.now() + timedelta(days=90),
            },
        )
        stdout.write("  [+] Platform announcement from CEO")

    for school_id, school in schools.items():
        sm = staff_map[school_id]
        ss = school_students[school_id]
        admin = sm["admins"][0]
        bursar = sm["bursars"][0]
        teacher = sm["teachers"][0]

        # Admin → all school members
        Announcement.objects.get_or_create(
            title=f"Start of Term 1 – {school.short_name}",
            sender=admin,
            school=school,
            defaults={
                "content": (
                    f"Welcome back! Term 1 of the 2025-2026 academic year begins on "
                    f"September 8, 2025. All students must report by 7:30 AM in full uniform. "
                    f"Parents are reminded to settle all outstanding fees by October 31."
                ),
                "target": "SCHOOL_ALL",
                "is_pinned": True,
            },
        )

        # Bursar → students only (fees reminder)
        Announcement.objects.get_or_create(
            title=f"Fee Payment Deadline – {school.short_name}",
            sender=bursar,
            school=school,
            defaults={
                "content": (
                    "All school fees (XAF 45,000) must be paid by 31 October 2025. "
                    "Late payments will attract a 10% surcharge. Visit the bursar's office "
                    "or pay via Orange Money / MTN MoMo."
                ),
                "target": "STUDENT",
            },
        )

        # Teacher → students
        Announcement.objects.get_or_create(
            title="Mathematics Test – Week 4",
            sender=teacher,
            school=school,
            defaults={
                "content": (
                    "There will be a Mathematics test on Friday of Week 4. "
                    "Topics covered: Algebra, Trigonometry, and Coordinate Geometry. "
                    "Revise Chapters 3-6 of the textbook."
                ),
                "target": "STUDENT",
            },
        )

        # Personal message to first parent
        if ss["parents"]:
            parent = ss["parents"][0]
            Announcement.objects.get_or_create(
                title="Parent-Teacher Meeting",
                sender=admin,
                school=school,
                defaults={
                    "content": (
                        "You are cordially invited to the Parent-Teacher meeting "
                        "scheduled for Saturday, October 4, 2025 at 10:00 AM in the school hall."
                    ),
                    "target": "PERSONAL",
                    "target_user": parent,
                },
            )

    stdout.write("  Done: announcements seeded.")


# ─── Chat Conversations ───────────────────────────────────────────────────────

def _seed_chat(schools, exec_users, staff_map, school_students, stdout):
    from apps.chat.models import Conversation, Message

    ceo = next((u for u in exec_users.values() if u.role == "CEO"), None)
    cto = next((u for u in exec_users.values() if u.role == "CTO"), None)
    super_admin = next((u for u in exec_users.values() if u.role == "SUPER_ADMIN"), None)

    # ── Platform executive group chat ─────────────────────────────────────────
    if ceo and cto and super_admin:
        exec_convo = _get_or_create_group(
            name="EduIgnite Executive Board",
            conv_type="group",
            created_by=ceo,
            participants=[ceo, cto, super_admin],
            school=None,
        )
        _seed_messages(exec_convo, [
            (ceo, "Good morning team! The platform is live. Let's make it count."),
            (cto, "All systems are up. Database migrations ran cleanly. Ready for traffic."),
            (super_admin, "Monitoring dashboard looks green. No critical alerts."),
            (ceo, "Excellent. Let's stay coordinated this week."),
        ], stdout)
        stdout.write("  [+] Executive group chat ready")

    for school_id, school in schools.items():
        sm = staff_map[school_id]
        ss = school_students[school_id]
        admin = sm["admins"][0]
        sub_admin = sm["sub_admins"][0]
        teachers = sm["teachers"]
        bursar = sm["bursars"][0]
        librarian = sm["librarians"][0]
        students = ss["students"]
        parents = ss["parents"]

        # ── School staff group chat ────────────────────────────────────────────
        staff_convo = _get_or_create_group(
            name=f"Staff – {school.short_name}",
            conv_type="official",
            created_by=admin,
            participants=[admin, sub_admin] + teachers + [bursar, librarian],
            school=school,
        )
        _seed_messages(staff_convo, [
            (admin, f"Welcome to the {school.short_name} staff channel!"),
            (sub_admin, "Thank you. Great to have everyone connected here."),
            (teachers[0], "I'll be sharing weekly lesson plans here for coordination."),
            (bursar, "Fee collection updates will also be posted in this channel."),
            (librarian, "Library schedule and new arrivals will be announced here too."),
        ], stdout)

        # ── Teacher → Admin DM ─────────────────────────────────────────────────
        ta_dm = _get_or_create_direct(teachers[0], admin)
        _seed_messages(ta_dm, [
            (teachers[0], "Good morning. I wanted to confirm the exam schedule for next week."),
            (admin, "Yes, exams run Mon-Fri. You'll receive the timetable by Friday."),
            (teachers[0], "Perfect. I'll prepare the papers accordingly."),
        ], stdout)

        # ── Parent → Teacher DM ────────────────────────────────────────────────
        if parents:
            pt_dm = _get_or_create_direct(parents[0], teachers[0])
            _seed_messages(pt_dm, [
                (parents[0], "Good day teacher. How is my child performing this term?"),
                (teachers[0], "Hello! Your child is doing very well, especially in Algebra. Keep encouraging them."),
                (parents[0], "Thank you so much. I'll make sure they keep up the good work."),
            ], stdout)

        # ── Student group chat (class) ─────────────────────────────────────────
        if len(students) >= 2:
            stu_convo = _get_or_create_group(
                name=f"Form 5 Science – {school.short_name}",
                conv_type="group",
                created_by=students[0].user,
                participants=[s.user for s in students[:4]],
                school=school,
            )
            _seed_messages(stu_convo, [
                (students[0].user, "Has everyone seen the Math test announcement?"),
                (students[1].user, "Yes! I'm revising Chapter 4 right now."),
                (students[2].user if len(students) > 2 else students[0].user, "Let's form a study group this weekend."),
                (students[0].user, "Great idea! Saturday at 10am in the library?"),
            ], stdout)

        # ── Bursar → Admin DM ──────────────────────────────────────────────────
        ba_dm = _get_or_create_direct(bursar, admin)
        _seed_messages(ba_dm, [
            (bursar, "Fee collections for Week 1 are at 65%. Shall I send reminders?"),
            (admin, "Yes please. Send SMS reminders to all outstanding parents."),
            (bursar, "Done. I'll update you with the end-of-week report."),
        ], stdout)

    stdout.write("  Done: chat conversations and messages seeded.")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_group(name, conv_type, created_by, participants, school):
    from apps.chat.models import Conversation

    convo = Conversation.objects.filter(name=name, conversation_type=conv_type).first()
    if not convo:
        convo = Conversation.objects.create(
            name=name,
            conversation_type=conv_type,
            created_by=created_by,
            school=school,
            is_active=True,
        )
        convo.add_participant(created_by, role="admin")
        for p in participants:
            if p != created_by:
                convo.add_participant(p, role="member")
    return convo


def _get_or_create_direct(user_a, user_b):
    from apps.chat.models import Conversation

    convo = (
        Conversation.objects.filter(
            conversation_type="direct", participants=user_a
        ).filter(participants=user_b).first()
    )
    if not convo:
        convo = Conversation.objects.create(
            conversation_type="direct",
            created_by=user_a,
            is_active=True,
        )
        convo.add_participant(user_a, role="admin")
        convo.add_participant(user_b, role="member")
    return convo


def _seed_messages(convo, msg_tuples, stdout):
    from apps.chat.models import Message

    if convo.messages.exists():
        return  # already seeded

    last_msg = None
    for sender, text in msg_tuples:
        msg = Message.objects.create(
            conversation=convo,
            sender=sender,
            text=text,
            message_type="text",
            is_read=True,
        )
        last_msg = msg

    if last_msg:
        convo.last_message = last_msg.text[:100]
        convo.last_message_at = last_msg.created_at
        convo.save(update_fields=["last_message", "last_message_at"])


# ─── Entry point ──────────────────────────────────────────────────────────────

def run(stdout, schools, exec_users, staff_map, school_students):
    _seed_announcements(schools, exec_users, staff_map, school_students, stdout)
    _seed_chat(schools, exec_users, staff_map, school_students, stdout)
