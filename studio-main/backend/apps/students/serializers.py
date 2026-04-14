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
        fields = ['id', 'parent', 'parent_name', 'student', 'student_name', 'relationship', 'is_primary', 'created']
        read_only_fields = ['id', 'created']


class StudentListSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    parent_count = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'admission_number', 'student_class', 'class_level',
            'section', 'annual_average', 'is_on_honour_roll', 'parent_count'
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
            'id', 'user', 'school', 'student_class', 'class_level', 'section',
            'date_of_birth', 'age', 'gender', 'guardian_name', 'guardian_phone',
            'guardian_whatsapp', 'admission_number', 'admission_date',
            'annual_average', 'is_on_honour_roll', 'qr_code', 'parent_links',
            'created', 'modified'
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
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Student
        fields = [
            'email', 'first_name', 'last_name', 'password', 'school', 'student_class',
            'class_level', 'section', 'date_of_birth', 'gender', 'guardian_name',
            'guardian_phone', 'guardian_whatsapp', 'admission_number', 'admission_date'
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_admission_number(self, value):
        if Student.objects.filter(admission_number=value).exists():
            raise serializers.ValidationError("A student with this admission number already exists.")
        return value

    def _generate_matricule(self):
        while True:
            matricule = f'STU{_uuid.uuid4().hex[:8].upper()}'
            if not User.objects.filter(matricule=matricule).exists():
                return matricule

    def create(self, validated_data):
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        password = validated_data.pop('password')

        # Create user — User model uses a single `name` field
        user = User.objects.create_user(
            matricule=self._generate_matricule(),
            name=f"{first_name} {last_name}",
            email=email,
            role='STUDENT',
            password=password,
        )

        # Create student profile
        student = Student.objects.create(user=user, **validated_data)
        student.generate_qr_code()
        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            'student_class', 'class_level', 'section', 'date_of_birth', 'gender',
            'guardian_name', 'guardian_phone', 'guardian_whatsapp'
        ]


class HonourRollSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    rank = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'admission_number', 'student_class', 'annual_average', 'rank'
        ]
        read_only_fields = ['id', 'annual_average']

    def get_rank(self, obj):
        # Calculate rank based on annual_average in the same class and school
        count = Student.objects.filter(
            school=obj.school,
            class_level=obj.class_level,
            annual_average__gt=obj.annual_average
        ).count()
        return count + 1
