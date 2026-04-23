"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Library,
  Search,
  Book,
  Clock,
  Plus,
  History,
  BookOpen,
  Settings2,
  Save,
  Pencil,
  Trash2,
  Eye,
  X,
  BookMarked,
  Loader2,
  ArrowLeft,
  Download,
  Upload,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  FileDown,
  Info,
  UserCheck,
  RotateCcw,
  ArrowRightLeft,
  Printer,
  QrCode,
  User,
  GraduationCap
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { libraryService } from "@/lib/api/services/library.service";
import { studentsService } from "@/lib/api/services/students.service";

export default function LibraryPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [books, setBooks] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [myLoans, setMyLoans] = useState<any[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);
  const [isLoadingMyLoans, setIsLoadingMyLoans] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [selectedBookForLoan, setSelectedBookForLoan] = useState<any>(null);
  const [borrowRequestTicket, setBorrowRequestTicket] = useState<any>(null);
  const [borrowerData, setBorrowerData] = useState({ studentId: "", duration: "7" });
  const [issuedReceipt, setIssuedReceipt] = useState<any>(null);

  const [newBookData, setNewBookData] = useState({
    title: "",
    author: "",
    category: "Science",
    isbn: "",
    total: 5,
    description: "",
    borrowDuration: 7,
    overdueFee: 500
  });

  const isLibrarian = user?.role === "LIBRARIAN";
  const isManagement = ["SCHOOL_ADMIN", "SUB_ADMIN", "LIBRARIAN"].includes(user?.role || "");
  const isStudent = user?.role === "STUDENT";

  // Load books
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setHasError(false);
        const [booksResponse, categoryResponse] = await Promise.all([
          libraryService.getBooks({ limit: 200 }),
          libraryService.getCategories({ limit: 100 }),
        ]);
        const bookList = Array.isArray(booksResponse) ? booksResponse : booksResponse?.results || [];
        const categoryList = Array.isArray(categoryResponse) ? categoryResponse : categoryResponse?.results || [];
        setCategoriesData(categoryList);
        setBooks(
          bookList.map((book: any) => ({
            ...book,
            category: book.category_name || book.category?.name || "Uncategorized",
            cover: book.cover_image,
            available: book.available_copies,
            total: book.total_copies,
          }))
        );
      } catch (error) {
        console.error("Error loading books:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load books", variant: "destructive" });
      } finally {
        setIsLoadingBooks(false);
      }
    };

    loadBooks();
  }, [toast]);

  // Load loans
  useEffect(() => {
    const loadLoans = async () => {
      try {
        const [loanResponse, overdueResponse, studentsResponse] = await Promise.all([
          libraryService.getLoans({ limit: 200 }),
          libraryService.getOverdueLoans({ limit: 100 }),
          studentsService.getStudents({ limit: 200 }),
        ]);
        const loanList = Array.isArray(loanResponse) ? loanResponse : loanResponse?.results || [];
        const overdueList = Array.isArray(overdueResponse) ? overdueResponse : overdueResponse?.results || [];
        const studentList = Array.isArray(studentsResponse) ? studentsResponse : studentsResponse?.results || [];
        setStudents(studentList);
        setLoans(loanList);
        setRequests([]);
        setOverdueLoans(overdueList);
      } catch (error) {
        console.error("Error loading loans:", error);
        toast({ title: "Error", description: "Failed to load loans", variant: "destructive" });
      } finally {
        setIsLoadingLoans(false);
      }
    };

    if (isLibrarian || isManagement) {
      loadLoans();
    }
  }, [isLibrarian, isManagement, toast]);

  // Load student's own loans
  useEffect(() => {
    const loadMyLoans = async () => {
      try {
        const data = await libraryService.getMyLoans({ limit: 100 });
        setMyLoans(Array.isArray(data) ? data : data?.results || []);
      } catch (error) {
        console.error("Error loading my loans:", error);
        toast({ title: "Error", description: "Failed to load your loans", variant: "destructive" });
      } finally {
        setIsLoadingMyLoans(false);
      }
    };

    if (isStudent) {
      loadMyLoans();
    }
  }, [isStudent, toast]);

  // Load library stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await libraryService.getLibraryStats();
        setStats(data);
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, []);

  const filteredBooks = books.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(books.map((b) => b.category)));

  const handleAddBook = async () => {
    if (!newBookData.title || !newBookData.author) return;

    setIsProcessing(true);
    try {
      const matchedCategory = categoriesData.find(
        (category) => category.name?.toLowerCase() === newBookData.category.toLowerCase()
      );
      const data = await libraryService.createBook({
        title: newBookData.title,
        author: newBookData.author,
        category: matchedCategory?.id,
        isbn: newBookData.isbn,
        total_copies: newBookData.total,
        available_copies: newBookData.total,
        description: newBookData.description,
      });
      setBooks([{ ...data, category: data.category_name || newBookData.category, available: data.available_copies, total: data.total_copies }, ...books]);
      setNewBookData({
        title: "",
        author: "",
        category: "Science",
        isbn: "",
        total: 5,
        description: "",
        borrowDuration: 7,
        overdueFee: 500
      });
      toast({ title: "Success", description: "Book added to catalog" });
    } catch (error) {
      console.error("Error adding book:", error);
      toast({ title: "Error", description: "Failed to add book", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssueLoan = async () => {
    if (!borrowerData.studentId || !selectedBookForLoan) return;

    setIsProcessing(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(borrowerData.duration, 10));
      const data = await libraryService.issueBook({
        bookId: selectedBookForLoan.id,
        borrowerId: borrowerData.studentId,
        dueDate: dueDate.toISOString().split("T")[0],
      });
      setLoans([data, ...loans]);
      setIssuedReceipt(data);
      setSelectedBookForLoan(null);
      setBorrowerData({ studentId: "", duration: "7" });
      toast({ title: "Success", description: "Loan issued" });
    } catch (error) {
      console.error("Error issuing loan:", error);
      toast({ title: "Error", description: "Failed to issue loan", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStudentBorrowRequest = async (book: any) => {
    toast({
      title: "Ask the librarian",
      description: "Student self-service requests are not enabled yet for this school. A librarian can issue this book from the management tab.",
    });
  };

  const handleReturnBook = async (loan: any) => {
    setIsProcessing(true);
    try {
      await libraryService.returnBook({ loanId: loan.id });
      setLoans((prev) => prev.filter((l) => l.id !== loan.id));
      setMyLoans((prev) => prev.filter((l) => l.id !== loan.id));
      toast({ title: "Success", description: "Book return recorded" });
    } catch (error) {
      console.error("Error returning book:", error);
      toast({ title: "Error", description: "Failed to return book", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    window.location.reload();
  };

  if (hasError && !isLoadingBooks) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-bold">Failed to Load Library</h2>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button onClick={handleRetry}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-2xl shadow-xl border-2 border-white shrink-0">
              <Library className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline tracking-tighter uppercase">Library Management</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage books, loans, and catalog.</p>
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-bold">Total Books</p>
              <p className="text-3xl font-black text-primary">{stats.total_books || stats.totalBooks || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-bold">Available</p>
              <p className="text-3xl font-black text-green-600">{books.reduce((sum, book) => sum + (book.available || 0), 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-bold">Active Loans</p>
              <p className="text-3xl font-black text-blue-600">{loans.length}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-bold">Overdue</p>
              <p className="text-3xl font-black text-destructive">{stats.overdue_loans || stats.overdueCount || overdueLoans.length || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-2xl grid-cols-2 sm:grid-cols-4 sm:w-auto sm:max-w-[800px]">
          <TabsTrigger value="catalog" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
            <Book className="w-4 h-4" /> Catalog
          </TabsTrigger>
          {isStudent && (
            <TabsTrigger value="myloans" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <BookMarked className="w-4 h-4" /> My Loans
            </TabsTrigger>
          )}
          {isManagement && (
            <TabsTrigger value="management" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4" /> Loan Management
            </TabsTrigger>
          )}
          {isLibrarian && (
            <TabsTrigger value="addbook" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <Plus className="w-4 h-4" /> Add Book
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="catalog" className="animate-in fade-in space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search books..."
                  className="pl-9 bg-accent/30 border-none rounded-xl h-12 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px] h-12 bg-accent/30 border-none rounded-xl">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingBooks ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No books found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map((book) => (
                  <Card key={book.id} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all bg-white">
                    <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                      {book.cover ? (
                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <Book className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-tight">{book.title}</CardTitle>
                      <CardDescription className="text-xs">{book.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <Badge variant="secondary">{book.category}</Badge>
                        <span className="font-bold text-primary">{book.available} / {book.total}</span>
                      </div>
                      {book.description && <p className="text-xs text-muted-foreground line-clamp-2">{book.description}</p>}
                      {isStudent ? (
                        <Button
                          size="sm"
                          className="w-full rounded-lg gap-2"
                          onClick={() => handleStudentBorrowRequest(book)}
                          disabled={book.available === 0 || isProcessing}
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          {book.available === 0 ? "Unavailable" : "Request"}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {borrowRequestTicket && (
            <Dialog defaultOpen onOpenChange={() => setBorrowRequestTicket(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Borrow Request Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-4 border-t border-b">
                  <div>
                    <p className="text-xs text-muted-foreground">Book Title</p>
                    <p className="font-bold">{borrowRequestTicket.bookTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Author</p>
                    <p className="font-bold">{borrowRequestTicket.bookAuthor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ISBN</p>
                    <p className="text-sm">{borrowRequestTicket.bookIsbn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-bold">{borrowRequestTicket.duration} days</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Present this ticket to the librarian to complete your loan.</p>
                <DialogFooter>
                  <Button onClick={() => setBorrowRequestTicket(null)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {isStudent && (
          <TabsContent value="myloans" className="animate-in fade-in space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <h2 className="text-lg font-black text-primary uppercase">My Loans</h2>

              {isLoadingMyLoans ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : myLoans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">You have no active loans</div>
              ) : (
                <div className="space-y-3">
                  {myLoans.map((loan) => (
                    <Card key={loan.id} className="border shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-bold">{loan.book_title || loan.book?.title || "Library Book"}</p>
                            <p className="text-xs text-muted-foreground mt-1">Return by: {loan.due_date || loan.returnDate}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-black">
                            {loan.status || "Active"}
                          </Badge>
                        </div>
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          Please return this book to the librarian so the official return can be recorded.
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {isManagement && (
          <TabsContent value="management" className="animate-in fade-in space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-black text-primary uppercase mb-4">Active Loans</h2>
                {isLoadingLoans ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : loans.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active loans</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Book</TableHead>
                          <TableHead>Borrow Date</TableHead>
                          <TableHead>Return Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan) => (
                          <TableRow key={loan.id}>
                            <TableCell className="font-bold">{loan.borrower_name || loan.borrower?.name}</TableCell>
                            <TableCell>{loan.book_title || loan.book?.title}</TableCell>
                            <TableCell className="text-xs">{loan.issued_date}</TableCell>
                            <TableCell className="text-xs">{loan.due_date}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReturnBook(loan)}
                                disabled={isProcessing}
                              >
                                Return
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {overdueLoans.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-destructive mb-4">Overdue</h3>
                  <div className="space-y-2">
                    {overdueLoans.map((loan) => (
                      <Card key={loan.id} className="border border-destructive/20 bg-destructive/5">
                        <CardContent className="pt-4">
                          <p className="font-bold">{loan.book_title || loan.book?.title}</p>
                          <p className="text-xs text-destructive">Due since {loan.due_date}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Issue Book to Student</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">Select Book</Label>
                      <Select value={selectedBookForLoan?.id || ""} onValueChange={(id) => setSelectedBookForLoan(books.find((b) => b.id === id))}>
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue placeholder="Choose book..." />
                        </SelectTrigger>
                        <SelectContent>
                          {books.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">Student</Label>
                      <Select value={borrowerData.studentId} onValueChange={(v) => setBorrowerData((prev) => ({ ...prev, studentId: v }))}>
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue placeholder="Choose student..." />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.user?.id || student.id}>
                              {student.user?.name || student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2 rounded-lg"
                    onClick={handleIssueLoan}
                    disabled={isProcessing || !selectedBookForLoan || !borrowerData.studentId}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Issue Loan
                  </Button>
                </div>
              </div>
            </div>

            {issuedReceipt && (
              <Dialog defaultOpen onOpenChange={() => setIssuedReceipt(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Loan Receipt</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-4 border-t border-b">
                    <div>
                      <p className="text-xs text-muted-foreground">Book</p>
                      <p className="font-bold">{issuedReceipt.book_title || issuedReceipt.book?.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Student</p>
                      <p className="font-bold">{issuedReceipt.borrower_name || issuedReceipt.borrower?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Return Date</p>
                      <p className="font-bold">{issuedReceipt.due_date}</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setIssuedReceipt(null)}>Done</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        )}

        {isLibrarian && (
          <TabsContent value="addbook" className="animate-in fade-in space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle>Add New Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Title</Label>
                    <Input
                      placeholder="Book title"
                      className="h-10 rounded-lg"
                      value={newBookData.title}
                      onChange={(e) => setNewBookData((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Author</Label>
                    <Input
                      placeholder="Author name"
                      className="h-10 rounded-lg"
                      value={newBookData.author}
                      onChange={(e) => setNewBookData((prev) => ({ ...prev, author: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">ISBN</Label>
                    <Input
                      placeholder="ISBN"
                      className="h-10 rounded-lg"
                      value={newBookData.isbn}
                      onChange={(e) => setNewBookData((prev) => ({ ...prev, isbn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Category</Label>
                    <Select value={newBookData.category} onValueChange={(v) => setNewBookData((prev) => ({ ...prev, category: v }))}>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesData.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Total Copies</Label>
                    <Input
                      type="number"
                      placeholder="5"
                      className="h-10 rounded-lg"
                      value={newBookData.total}
                      onChange={(e) => setNewBookData((prev) => ({ ...prev, total: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Borrow Duration (days)</Label>
                    <Input
                      type="number"
                      placeholder="7"
                      className="h-10 rounded-lg"
                      value={newBookData.borrowDuration}
                      onChange={(e) => setNewBookData((prev) => ({ ...prev, borrowDuration: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Description</Label>
                  <Textarea
                    placeholder="Book description..."
                    className="min-h-[100px] rounded-lg"
                    value={newBookData.description}
                    onChange={(e) => setNewBookData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <Button
                  className="w-full gap-2 rounded-lg h-12 font-black uppercase"
                  onClick={handleAddBook}
                  disabled={isProcessing || !newBookData.title || !newBookData.author}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add to Catalog
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
