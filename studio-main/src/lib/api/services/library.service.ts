import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Book,
  BookCategory,
  BookLoan,
  PaginatedResponse,
  ListParams,
} from '../types';

export const libraryService = {
  async getCategories(params?: ListParams): Promise<PaginatedResponse<BookCategory>> {
    const { data } = await apiClient.get(API.LIBRARY.CATEGORIES, { params });
    return data;
  },

  async createCategory(categoryData: Partial<BookCategory>): Promise<BookCategory> {
    const { data } = await apiClient.post(API.LIBRARY.CATEGORIES, categoryData);
    return data;
  },

  async updateCategory(id: string, categoryData: Partial<BookCategory>): Promise<BookCategory> {
    const { data } = await apiClient.patch(API.LIBRARY.CATEGORY_DETAIL(id), categoryData);
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(API.LIBRARY.CATEGORY_DETAIL(id));
  },

  async getBooks(params?: ListParams): Promise<PaginatedResponse<Book>> {
    const { data } = await apiClient.get(API.LIBRARY.BOOKS, { params });
    return data;
  },

  async getBook(id: string): Promise<Book> {
    const { data } = await apiClient.get(API.LIBRARY.BOOK_DETAIL(id));
    return data;
  },

  async searchBooks(query: string, params?: ListParams): Promise<PaginatedResponse<Book>> {
    const { data } = await apiClient.get(API.LIBRARY.SEARCH, {
      params: { ...params, q: query },
    });
    return data;
  },

  async getLowStockBooks(params?: ListParams): Promise<PaginatedResponse<Book>> {
    const { data } = await apiClient.get(API.LIBRARY.LOW_STOCK, { params });
    return data;
  },

  async createBook(bookData: Partial<Book>): Promise<Book> {
    const { data } = await apiClient.post(API.LIBRARY.BOOKS, bookData);
    return data;
  },

  async updateBook(id: string, bookData: Partial<Book>): Promise<Book> {
    const { data } = await apiClient.patch(API.LIBRARY.BOOK_DETAIL(id), bookData);
    return data;
  },

  async deleteBook(id: string): Promise<void> {
    await apiClient.delete(API.LIBRARY.BOOK_DETAIL(id));
  },

  async getLoans(params?: ListParams): Promise<PaginatedResponse<BookLoan>> {
    const { data } = await apiClient.get(API.LIBRARY.LOANS, { params });
    return data;
  },

  async getLoan(id: string): Promise<BookLoan> {
    const { data } = await apiClient.get(API.LIBRARY.LOAN_DETAIL(id));
    return data;
  },

  async issueBook(
    bookId: string,
    borrowerId: string,
    dueDate: string
  ): Promise<BookLoan> {
    const { data } = await apiClient.post(API.LIBRARY.ISSUE(bookId), {
      borrower: borrowerId,
      due_date: dueDate,
    });
    return data;
  },

  async returnBook(loanId: string, notes?: string): Promise<BookLoan> {
    const { data } = await apiClient.post(API.LIBRARY.RETURN(loanId), {
      notes,
    });
    return data;
  },

  async getMyLoans(params?: ListParams): Promise<PaginatedResponse<BookLoan>> {
    const { data } = await apiClient.get(API.LIBRARY.MY_LOANS, { params });
    return data;
  },

  async getOverdueLoans(params?: ListParams): Promise<PaginatedResponse<BookLoan>> {
    const { data } = await apiClient.get(API.LIBRARY.OVERDUE, { params });
    return data;
  },

  async getLibraryStats(): Promise<any> {
    const { data } = await apiClient.get(API.LIBRARY.STATS);
    return data;
  },
};
