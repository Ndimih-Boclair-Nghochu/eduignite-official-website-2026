from django.contrib import admin
from .models import BookCategory, Book, BookLoan


@admin.register(BookCategory)
class BookCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'school', 'color']
    list_filter = ['school', 'created_at']
    search_fields = ['name']


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'total_copies', 'available_copies', 'is_active']
    list_filter = ['school', 'category', 'is_active', 'publication_year']
    search_fields = ['title', 'author', 'isbn']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BookLoan)
class BookLoanAdmin(admin.ModelAdmin):
    list_display = ['book', 'borrower', 'issued_date', 'due_date', 'status', 'fine_amount']
    list_filter = ['school', 'status', 'issued_date', 'due_date']
    search_fields = ['book__title', 'borrower__first_name', 'borrower__last_name']
    readonly_fields = ['created_at', 'updated_at', 'issued_date']
    date_hierarchy = 'issued_date'
