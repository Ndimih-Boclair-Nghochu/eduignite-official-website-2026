"""
Seed helper – Step 01: Platform-level executive users + FounderProfiles.

Creates SUPER_ADMIN, CEO, CTO, COO, INV, DESIGNER accounts and links the
CEO / CTO as primary founders in the FounderProfile table.
"""
from django.utils import timezone
from datetime import timedelta

DEFAULT_PASSWORD = "EduIgnite@2026!"


def run(stdout):
    from apps.users.models import User, UserRole, FounderProfile, FounderShareAdjustment
    from core.image_utils import generate_placeholder_avatar

    executives = [
        {
            "matricule": "EI-SUPER-001",
            "name": "Platform Super Admin",
            "email": "superadmin@eduignite.com",
            "role": UserRole.SUPER_ADMIN,
            "phone": "+237670000001",
            "founder": False,
        },
        {
            "matricule": "EI-CEO-001",
            "name": "Ndimih Boclair Nghochu",
            "email": "ceo@eduignite.com",
            "role": UserRole.CEO,
            "phone": "+237670000002",
            "founder": True,
            "founder_title": "Chief Executive Officer & Co-Founder",
            "share_pct": 40.00,
            "is_primary": True,
        },
        {
            "matricule": "EI-CTO-001",
            "name": "EduIgnite CTO",
            "email": "cto@eduignite.com",
            "role": UserRole.CTO,
            "phone": "+237670000003",
            "founder": True,
            "founder_title": "Chief Technology Officer & Co-Founder",
            "share_pct": 30.00,
            "is_primary": True,
        },
        {
            "matricule": "EI-COO-001",
            "name": "EduIgnite COO",
            "email": "coo@eduignite.com",
            "role": UserRole.COO,
            "phone": "+237670000004",
            "founder": False,
        },
        {
            "matricule": "EI-INV-001",
            "name": "EduIgnite Investor One",
            "email": "investor1@eduignite.com",
            "role": UserRole.INV,
            "phone": "+237670000005",
            "founder": True,
            "founder_title": "Lead Investor",
            "share_pct": 20.00,
            "is_primary": False,
            "renewable": True,
        },
        {
            "matricule": "EI-DES-001",
            "name": "EduIgnite Lead Designer",
            "email": "designer@eduignite.com",
            "role": UserRole.DESIGNER,
            "phone": "+237670000006",
            "founder": False,
        },
    ]

    created_users = {}
    for data in executives:
        user, created = User.objects.get_or_create(
            matricule=data["matricule"],
            defaults={
                "name": data["name"],
                "email": data["email"],
                "role": data["role"],
                "phone": data["phone"],
                "is_active": True,
                "is_staff": True,
                "is_license_paid": True,
                "avatar": generate_placeholder_avatar(data["name"]),
            },
        )
        if created:
            user.set_password(DEFAULT_PASSWORD)
            user.save()
            stdout.write(f"  [+] Created executive: {user.matricule} ({user.role})")
        else:
            stdout.write(f"  [=] Exists: {user.matricule}")

        created_users[data["matricule"]] = user

        # FounderProfile
        if data.get("founder"):
            fp, fp_created = FounderProfile.objects.get_or_create(
                user=user,
                defaults={
                    "founder_title": data.get("founder_title", "Founder"),
                    "primary_share_percentage": data.get("share_pct", 0),
                    "is_primary_founder": data.get("is_primary", False),
                    "can_be_removed": not data.get("is_primary", False),
                    "has_renewable_shares": data.get("renewable", False),
                    "share_renewal_period_days": 365,
                    "shares_expire_at": (
                        timezone.now() + timedelta(days=365)
                        if data.get("renewable")
                        else None
                    ),
                },
            )
            if fp_created:
                stdout.write(f"      -> FounderProfile created ({fp.founder_title})")

    # Add a share adjustment for the CTO from the CEO
    cto_user = created_users.get("EI-CTO-001")
    ceo_user = created_users.get("EI-CEO-001")
    if cto_user and ceo_user:
        fp_cto = FounderProfile.objects.filter(user=cto_user).first()
        if fp_cto and not fp_cto.share_adjustments.exists():
            FounderShareAdjustment.objects.create(
                founder=fp_cto,
                percentage=5.00,
                note="Performance bonus Q1 2026",
                added_by=ceo_user,
                expires_at=timezone.now() + timedelta(days=180),
            )
            stdout.write("      -> Share adjustment (+5%) added for CTO")

    stdout.write(f"  Done: {len(executives)} executive accounts ready.")
    return created_users
