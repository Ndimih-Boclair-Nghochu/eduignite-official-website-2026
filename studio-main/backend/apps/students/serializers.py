from datetime import date
from rest_framework import serializers
from django.contrib.auth import get_user_model
import uuid as _uuid

from .models import Student, ParentStudentLink
from apps.users.serializers import UserListSerializer as UserBasicSerializer

User = get_user_model()


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.get_full_name', read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = ParentStudentLink
        fields = [
            'id',
            'parent',
            'parent_name',
            'student',
            'student_name',
            'relationship',
            'is_primary',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class StudentListSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    parent_count = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id',
            'user',
            'admission_number',
            'student_class',
            'class_level',
            'section',
            'annual_average',
            'is_on_honour_roll',
            'parent_count',
        ]
        read_only_fields = ['id', 'annual_average', 'is_on_honour_roll']

    def get_parent_count(self, obj):
        return obj.parent_links.count()


class StudentDetailSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    parent_links = ParentStudentLinkSerializer(many=True, read_only=True)
    age = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id',
            'user',
            'school',
            'student_class',
            'class_level',
            'section',
            'date_of_birth',
            'age',
            'gender',
            'guardian_name',
            'guardian_phone',
            'guardian_whatsapp',
            'admission_number',
            'admission_date',
            'annual_average',
            'is_on_honour_roll',
            'qr_code',
            'parent_links',
            'created',
            'modified',
        ]
        read_only_fields = ['id', 'created', 'modified', 'qr_code', 'annual_average', 'is_on_honour_roll']

    def get_age(self, obj):
        from datetime import date

        if obj.date_of_birth:
            today = date.today()
            return today.year - obj.date_of_birth.year - (
                (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
            )
        return None


class StudentCreateSerializer(serializers.ModelSerializer):
    school = serializers.PrimaryKeyRelatedField(read_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    class_level = serializers.ChoiceField(choices=Student.CLASS_LEVEL_CHOICES, required=False, default='form1')
    section = serializers.ChoiceField(choices=Student.SECTION_CHOICES, required=False, default='general')
    gender = serializers.ChoiceField(choices=Student.GENDER_CHOICES, required=False, default='other')
    guardian_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    guardian_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    guardian_whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    admission_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    admission_date = serializers.DateField(required=False)
    parent_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    parent_email = serializers.EmailField(required=False, allow_blank=True)
    parent_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    parent_whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    parent_relationship = serializers.ChoiceField(
        choices=ParentStudentLink.RELATIONSHIP_CHOICES,
        required=False,
        default='guardian',
    )
    create_parent_account = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = Student
        fields = [
            'email',
            'name',
            'first_name',
            'last_name',
            'phone',
            'whatsapp',
            'password',
            'school',
            'student_class',
            'class_level',
            'section',
            'date_of_birth',
            'gender',
            'guardian_name',
            'guardian_phone',
            'guardian_whatsapp',
            'admission_number',
            'admission_date',
            'parent_name',
            'parent_email',
            'parent_phone',
            'parent_whatsapp',
            'parent_relationship',
            'create_parent_account',
        ]

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_admission_number(self, value):
        if value and Student.objects.filter(admission_number=value).exists():
            raise serializers.ValidationError("A student with this admission number already exists.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        requester = getattr(request, 'user', None)

        if requester and requester.is_authenticated and requester.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            if not requester.school:
                raise serializers.ValidationError({'school': 'Your account is not linked to a school.'})
            attrs['school'] = requester.school

        full_name = attrs.get('name') or " ".join(
            part for part in [attrs.get('first_name', '').strip(), attrs.get('last_name', '').strip()] if part
        ).strip()
        if not full_name:
            raise serializers.ValidationError({'name': 'Provide the student full name.'})
        attrs['name'] = full_name
        attrs['class_level'] = attrs.get('class_level') or self._infer_class_level(attrs.get('student_class', ''))
        attrs['section'] = attrs.get('section') or self._infer_section(attrs.get('student_class', ''))

        if attrs.get('create_parent_account'):
            if not attrs.get('parent_name', '').strip() or not attrs.get('parent_email', '').strip():
                raise serializers.ValidationError({
                    'parent_email': 'Parent name and email are required when creating a parent account.',
                })
            existing_parent = User.objects.filter(email=attrs.get('parent_email', '').strip()).first()
            if existing_parent and existing_parent.role != 'PARENT':
                raise serializers.ValidationError({'parent_email': 'This email belongs to a non-parent account.'})
            if existing_parent and attrs.get('school') and existing_parent.school_id != attrs['school'].id:
                raise serializers.ValidationError({'parent_email': 'Parent account belongs to a different school.'})

        return attrs

    def _infer_class_level(self, student_class):
        label = (student_class or '').strip().lower()
        if 'upper sixth' in label or 'upper 6' in label or 'uppersixth' in label:
            return 'upper_sixth'
        if 'lower sixth' in label or 'lower 6' in label or 'lowersixth' in label:
            return 'lower_sixth'
        for level in ['form1', 'form2', 'form3', 'form4', 'form5']:
            if level in label.replace(' ', ''):
                return level
        if 'form 1' in label:
            return 'form1'
        if 'form 2' in label:
            return 'form2'
        if 'form 3' in label:
            return 'form3'
        if 'form 4' in label:
            return 'form4'
        if 'form 5' in label:
            return 'form5'
        return 'form1'

    def _infer_section(self, student_class):
        label = (student_class or '').strip().lower()
        if 'bilingual' in label:
            return 'bilingual'
        if 'technical' in label:
            return 'technical'
        if 'science' in label:
            return 'science'
        if 'arts' in label or 'art' in label:
            return 'arts'
        if 'commercial' in label or 'commerce' in label:
            return 'commercial'
        return 'general'

    def _generate_matricule(self):
        while True:
            matricule = f'STU{_uuid.uuid4().hex[:8].upper()}'
            if not User.objects.filter(matricule=matricule).exists():
                return matricule

    def _generate_parent_matricule(self):
        while True:
            matricule = f'PAR{_uuid.uuid4().hex[:8].upper()}'
            if not User.objects.filter(matricule=matricule).exists():
                return matricule

    def _generate_placeholder_email(self, matricule):
        email = f"{matricule.lower()}@students.eduignite.local"
        while User.objects.filter(email=email).exists():
            email = f"{matricule.lower()}.{_uuid.uuid4().hex[:4]}@students.eduignite.local"
        return email

    def _generate_admission_number(self, school):
        school_prefix = ''.join(ch for ch in (getattr(school, 'short_name', '') or school.id or 'SCH') if ch.isalnum()).upper()[:6] or 'SCH'
        while True:
            admission_number = f"{school_prefix}-{_uuid.uuid4().hex[:6].upper()}"
            if not Student.objects.filter(admission_number=admission_number).exists():
                return admission_number

    def create(self, validated_data):
        email = (validated_data.pop('email', '') or '').strip()
        name = validated_data.pop('name')
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)
        phone = validated_data.pop('phone', '')
        whatsapp = validated_data.pop('whatsapp', '')
        password = validated_data.pop('password', '')
        parent_name = validated_data.pop('parent_name', '').strip()
        parent_email = validated_data.pop('parent_email', '').strip()
        parent_phone = validated_data.pop('parent_phone', '').strip()
        parent_whatsapp = validated_data.pop('parent_whatsapp', '').strip()
        parent_relationship = validated_data.pop('parent_relationship', 'guardian')
        create_parent_account = validated_data.pop('create_parent_account', False)
        school = validated_data['school']
        matricule = self._generate_matricule()

        if not email:
            email = self._generate_placeholder_email(matricule)

        if not validated_data.get('admission_number'):
            validated_data['admission_number'] = self._generate_admission_number(school)
        if not validated_data.get('admission_date'):
            validated_data['admission_date'] = date.today()
        validated_data['guardian_name'] = validated_data.get('guardian_name', '').strip()
        validated_data['guardian_phone'] = validated_data.get('guardian_phone', '').strip()
        validated_data['guardian_whatsapp'] = validated_data.get('guardian_whatsapp', '').strip()
        validated_data['gender'] = validated_data.get('gender') or 'other'

        user = User.objects.create_user(
            matricule=matricule,
            name=name,
            email=email,
            role='STUDENT',
            phone=phone or None,
            whatsapp=whatsapp or None,
            school=school,
            password=password or '!pending_activation',
        )

        student = Student.objects.create(user=user, **validated_data)
        student.generate_qr_code()

        if create_parent_account and parent_email:
            parent = User.objects.filter(email=parent_email).first()
            if parent and parent.role != 'PARENT':
                raise serializers.ValidationError({'parent_email': 'This email belongs to a non-parent account.'})
            if parent and parent.school_id != student.school_id:
                raise serializers.ValidationError({'parent_email': 'Parent account belongs to a different school.'})

            if not parent:
                parent = User.objects.create_user(
                    matricule=self._generate_parent_matricule(),
                    name=parent_name,
                    email=parent_email,
                    phone=parent_phone or None,
                    whatsapp=parent_whatsapp or None,
                    role='PARENT',
                    school=student.school,
                    password='!pending_activation',
                )

            ParentStudentLink.objects.update_or_create(
                parent=parent,
                student=student,
                defaults={'relationship': parent_relationship, 'is_primary': True},
            )

        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name', required=False)
    email = serializers.EmailField(source='user.email', required=False)
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)
    whatsapp = serializers.CharField(source='user.whatsapp', required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            'name',
            'email',
            'phone',
            'whatsapp',
            'student_class',
            'class_level',
            'section',
            'date_of_birth',
            'gender',
            'guardian_name',
            'guardian_phone',
            'guardian_whatsapp',
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        student = super().update(instance, validated_data)

        if user_data:
            for field, value in user_data.items():
                setattr(student.user, field, value)
            student.user.save(update_fields=list(user_data.keys()))

        return student


class HonourRollSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    rank = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id',
            'user',
            'admission_number',
            'student_class',
            'annual_average',
            'rank',
        ]
        read_only_fields = ['id', 'annual_average']

    def get_rank(self, obj):
        count = Student.objects.filter(
            school=obj.school,
            class_level=obj.class_level,
            annual_average__gt=obj.annual_average
        ).count()
        return count + 1
