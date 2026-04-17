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
    email = serializers.EmailField(required=True)
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
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
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_admission_number(self, value):
        if Student.objects.filter(admission_number=value).exists():
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

        if attrs.get('create_parent_account'):
            if not attrs.get('parent_name', '').strip() or not attrs.get('parent_email', '').strip():
                raise serializers.ValidationError({
                    'parent_email': 'Parent name and email are required when creating a parent account.',
                })

        return attrs

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

    def create(self, validated_data):
        email = validated_data.pop('email')
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

        user = User.objects.create_user(
            matricule=self._generate_matricule(),
            name=name,
            email=email,
            role='STUDENT',
            phone=phone or None,
            whatsapp=whatsapp or None,
            school=validated_data['school'],
            password=password or '!pending_activation',
        )

        student = Student.objects.create(user=user, **validated_data)
        student.generate_qr_code()

        if create_parent_account and parent_email:
            parent = User.objects.filter(email=parent_email).first()
            if parent and parent.role != 'PARENT':
                raise serializers.ValidationError({'parent_email': 'This email belongs to a non-parent account.'})

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
