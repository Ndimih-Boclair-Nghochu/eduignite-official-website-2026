"""
Seed helper – Step 02: Schools + SchoolSettings.

Creates two demo schools (one Anglophone, one Francophone) covering
different Cameroonian regions so every school-level feature can be tested.
"""
from datetime import date


def run(stdout, exec_users: dict):
    from apps.schools.models import School, SchoolSettings

    school_data = [
        {
            "id": "GBHS-DOUALA-001",
            "name": "Government Bilingual High School Douala",
            "short_name": "GBHS Douala",
            "principal": "Mr. Emmanuel Fon",
            "motto": "Knowledge is Power",
            "location": "Akwa, Douala",
            "region": "Littoral",
            "division": "Wouri",
            "sub_division": "Douala 1",
            "city_village": "Douala",
            "address": "12 Rue de l'Indépendance, Akwa",
            "postal_code": "BP 1234",
            "phone": "+237233000001",
            "email": "gbhs.douala@edu.cm",
            "founded_year": 1975,
            "academic_year": "2025-2026",
        },
        {
            "id": "PSS-YAOUNDE-001",
            "name": "Presbyterian Secondary School Yaounde",
            "short_name": "PSS Yaounde",
            "principal": "Mrs. Grace Mbah",
            "motto": "Excellence Through Faith",
            "location": "Bastos, Yaounde",
            "region": "Centre",
            "division": "Mfoundi",
            "sub_division": "Yaounde 2",
            "city_village": "Yaounde",
            "address": "45 Avenue Kennedy, Bastos",
            "postal_code": "BP 5678",
            "phone": "+237222000002",
            "email": "pss.yaounde@edu.cm",
            "founded_year": 1962,
            "academic_year": "2025-2026",
        },
    ]

    created_schools = {}
    for sd in school_data:
        school, created = School.objects.get_or_create(
            id=sd["id"],
            defaults={
                "name": sd["name"],
                "short_name": sd["short_name"],
                "principal": sd["principal"],
                "motto": sd.get("motto", ""),
                "location": sd["location"],
                "region": sd["region"],
                "division": sd["division"],
                "sub_division": sd["sub_division"],
                "city_village": sd["city_village"],
                "address": sd["address"],
                "postal_code": sd.get("postal_code", ""),
                "phone": sd["phone"],
                "email": sd["email"],
                "status": "Active",
                "founded_year": sd.get("founded_year"),
            },
        )

        SchoolSettings.objects.get_or_create(
            school=school,
            defaults={
                "licence_expiry": date(2027, 12, 31),
                "max_students": 800,
                "max_teachers": 80,
                "academic_year": sd["academic_year"],
                "term": "First",
                "allow_ai_features": True,
                "ai_request_limit": 5000,
            },
        )

        if created:
            stdout.write(f"  [+] Created school: {school.id} – {school.name}")
        else:
            stdout.write(f"  [=] Exists: {school.id}")

        created_schools[sd["id"]] = school

    stdout.write(f"  Done: {len(created_schools)} schools ready.")
    return created_schools
