from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from .models import BookCategory, Book, BookLoan
from .serializers import (
    BookCategorySerializer, BookListSerializer, BookDetailSerializer,
    BookCreateSerializer, BookLoanSerializer, IssueLoanSerializer,
    ReturnLoanSerializer, LibraryStatsSerializer
)


class BookCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BookCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']

    def get_queryset(self):
        if not self.request.user.school_id:
            return BookCategory.objects.none()
        return BookCategory.objects.filter(school_id=self.request.user.school_id)

    def perform_create(self, serializer):
        if not self.request.user.school_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Your account is not assigned to a school.")
        serializer.save(school=self.request.user.school)

    def check_permissions(self, request):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
                self.permission_denied(request)
        return super().check_permissions(request)


class BookViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['title', 'author', 'isbn']
    filterset_fields = ['category', 'is_active']
    ordering_fields = ['title', 'author', 'available_copies', 'created_at']
    ordering = ['title']

    def get_queryset(self):
        if not self.request.user.school_id:
            return Book.objects.none()
        return Book.objects.filter(school_id=self.request.user.school_id, is_active=True)

    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update' or self.action == 'partial_update':
            return BookCreateSerializer
        elif self.action == 'retrieve':
            return BookDetailSerializer
        return BookListSerializer

    def perform_create(self, serializer):
        if not self.request.user.school_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Your account is not assigned to a school.")
        serializer.save(school=self.request.user.school)

    def check_permissions(self, request):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
                self.permission_denied(request)
        return super().check_permissions(request)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search books by title, author, isbn, or category"""
        query = request.query_params.get('q', '')
        category_id = request.query_params.get('category', None)

        books = self.get_queryset()

        if query:
            books = books.filter(
                Q(title__icontains=query) |
                Q(author__icontains=query) |
                Q(isbn__icontains=query)
            )

        if category_id:
            books = books.filter(category_id=category_id)

        serializer = BookListSerializer(books, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get books with available copies less than 3"""
        books = self.get_queryset().filter(available_copies__lt=3)
        serializer = BookListSerializer(books, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get books grouped by category"""
        categories = BookCategory.objects.filter(school_id=request.user.school_id)
        result = {}
        for category in categories:
            books = self.get_queryset().filter(category=category)
            result[category.name] = BookListSerializer(books, many=True).data
        return Response(result)


class BookLoanViewSet(viewsets.ModelViewSet):
    serializer_class = BookLoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'borrower', 'book']
    ordering_fields = ['issued_date', 'due_date', 'status']
    ordering = ['-issued_date']

    def get_queryset(self):
        user = self.request.user
        if user.role in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
            if not user.school_id:
                return BookLoan.objects.none()
            return BookLoan.objects.filter(school_id=user.school_id)
        return BookLoan.objects.filter(borrower=user)

    def check_permissions(self, request):
        if self.action in ['create', 'destroy']:
            if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
                self.permission_denied(request)
        return super().check_permissions(request)

    @action(detail=False, methods=['post'])
    def issue(self, request):
        """Issue a book to a borrower"""
        if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if not request.user.school_id:
            return Response({'detail': 'Your account is not assigned to a school.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = IssueLoanSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(school=request.user.school, librarian=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """Mark a book loan as returned"""
        if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        loan = self.get_object()
        serializer = ReturnLoanSerializer(loan, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def my_loans(self, request):
        """Get current user's loans"""
        loans = BookLoan.objects.filter(borrower=request.user)
        serializer = BookLoanSerializer(loans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get all overdue loans"""
        if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now().date()
        loans = BookLoan.objects.filter(
            school_id=request.user.school_id,
            due_date__lt=today,
            returned_date__isnull=True,
            status='Active'
        )
        serializer = BookLoanSerializer(loans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get library statistics"""
        if request.user.role not in ['LIBRARIAN', 'SCHOOL_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'COO']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now().date()
        stats = {
            'total_books': Book.objects.filter(school_id=request.user.school_id).count(),
            'loans_today': BookLoan.objects.filter(school_id=request.user.school_id, issued_date=today).count(),
            'overdue_loans': BookLoan.objects.filter(
                school_id=request.user.school_id,
                due_date__lt=today,
                returned_date__isnull=True,
                status='Active'
            ).count(),
            'low_stock_books': Book.objects.filter(school_id=request.user.school_id, available_copies__lt=3).count(),
            'total_students': 0,
        }
        serializer = LibraryStatsSerializer(stats)
        return Response(serializer.data)
