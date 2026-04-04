from rest_framework import serializers
from .models import BookCategory, Book, BookLoan
from users.models import User
from django.utils import timezone


class BookCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookCategory
        fields = ['id', 'name', 'color']


class BookListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'category', 'category_name', 'available_copies', 'total_copies']


class BookDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'school', 'school_name', 'title', 'author', 'isbn', 'category', 'category_name',
                  'publisher', 'publication_year', 'total_copies', 'available_copies', 'description',
                  'cover_image', 'location', 'is_active', 'created_at', 'updated_at']


class BookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['title', 'author', 'isbn', 'category', 'publisher', 'publication_year',
                  'total_copies', 'available_copies', 'description', 'cover_image', 'location']

    def validate(self, data):
        if data.get('available_copies', 0) > data.get('total_copies', 0):
            raise serializers.ValidationError("Available copies cannot exceed total copies")
        return data


class BookLoanSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    borrower_name = serializers.CharField(source='borrower.get_full_name', read_only=True)
    days_overdue = serializers.SerializerMethodField()

    class Meta:
        model = BookLoan
        fields = ['id', 'book', 'book_title', 'borrower', 'borrower_name', 'issued_date',
                  'due_date', 'status', 'days_overdue', 'fine_amount', 'fine_paid']

    def get_days_overdue(self, obj):
        return obj.days_overdue() if obj.is_overdue() else 0


class IssueLoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookLoan
        fields = ['book', 'borrower', 'due_date']

    def create(self, validated_data):
        book = validated_data['book']
        if book.available_copies < 1:
            raise serializers.ValidationError("Book is not available")
        loan = BookLoan.objects.create(**validated_data)
        book.available_copies -= 1
        book.save()
        return loan


class ReturnLoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookLoan
        fields = ['returned_date', 'notes']

    def update(self, instance, validated_data):
        instance.returned_date = validated_data.get('returned_date', timezone.now().date())
        instance.notes = validated_data.get('notes', instance.notes)
        instance.status = 'Returned'
        instance.fine_amount = instance.calculate_fine()
        instance.save()

        book = instance.book
        book.available_copies += 1
        book.save()

        return instance


class LibraryStatsSerializer(serializers.Serializer):
    total_books = serializers.IntegerField()
    loans_today = serializers.IntegerField()
    overdue_loans = serializers.IntegerField()
    low_stock_books = serializers.IntegerField()
    total_students = serializers.IntegerField()
