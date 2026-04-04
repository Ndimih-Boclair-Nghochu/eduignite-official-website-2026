"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Coins,
  Search,
  Receipt,
  CheckCircle2,
  Clock,
  Wallet,
  TrendingUp,
  Loader2,
  AlertCircle,
  X,
  CreditCard,
  Filter,
  CalendarDays,
  FileSpreadsheet,
  Building2,
  Plus,
  Settings2,
  Trash2,
  Save,
  Pencil,
  ArrowLeft,
  UserCheck,
  UserX,
  FileText,
  Activity,
  ChevronRight,
  Eye,
  RotateCcw,
  Users
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

const CLASSES = ["6ème / Form 1", "5ème / Form 2", "4ème / Form 3", "3ème / Form 4", "2nde / Form 5", "1ère / Lower Sixth", "Terminale / Upper Sixth"];
const SECTIONS = ["Anglophone Section", "Francophone Section", "Technical Section"];

export default function FeesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [activeFeeFilter, setActiveFeeFilter] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<any>(null);
  const [selectedClassDetails, setSelectedClassDetails] = useState<any>(null);
  const [issuedReceipt, setIssuedReceipt] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ type: "", amount: "" });

  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classStats, setClassStats] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isBursar = user?.role === "BURSAR";
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const isSubAdmin = user?.role === "SUB_ADMIN";
  const isAdmin = isSchoolAdmin || isSubAdmin;

  // Load fee types
  useEffect(() => {
    const loadFeeTypes = async () => {
      try {
        setHasError(false);
        const response = await fetch("/api/fees/structures");
        if (!response.ok) throw new Error("Failed to load fee types");
        const data = await response.json();
        setFeeTypes(data.feeTypes || []);
        if (data.feeTypes?.length > 0) {
          setActiveFeeFilter(data.feeTypes[0].name);
          setPaymentForm((prev) => ({ ...prev, type: data.feeTypes[0].name }));
        }
      } catch (error) {
        console.error("Error loading fee types:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load fee types", variant: "destructive" });
      } finally {
        setIsLoadingFees(false);
      }
    };

    loadFeeTypes();
  }, [toast]);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch("/api/students?limit=100");
        if (!response.ok) throw new Error("Failed to load students");
        const data = await response.json();
        setStudents(data.students || []);
      } catch (error) {
        console.error("Error loading students:", error);
        toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [toast]);

  // Load class statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/fees/statistics");
        if (!response.ok) throw new Error("Failed to load statistics");
        const data = await response.json();
        setClassStats(data.classStats || []);
      } catch (error) {
        console.error("Error loading statistics:", error);
        toast({ title: "Error", description: "Failed to load statistics", variant: "destructive" });
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [toast]);

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await fetch("/api/fees/payments");
        if (!response.ok) throw new Error("Failed to load transactions");
        const data = await response.json();
        setTransactions(data.payments || []);
      } catch (error) {
        console.error("Error loading transactions:", error);
        toast({ title: "Error", description: "Failed to load transactions", variant: "destructive" });
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, [toast]);

  const filteredClassStats = useMemo(() => {
    return classStats.filter((cls) => {
      const matchesSection = sectionFilter === "all" || cls.section === sectionFilter;
      return matchesSection;
    });
  }, [classStats, sectionFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = classFilter === "all" || s.class === classFilter;
      const matchesSection = sectionFilter === "all" || s.section === sectionFilter;

      const paidAmount = s.balances?.[activeFeeFilter] || 0;
      const totalAmount = s.totals?.[activeFeeFilter] || 0;
      const isPaid = paidAmount >= totalAmount;

      const matchesCompliance =
        complianceFilter === "all" || (complianceFilter === "paid" && isPaid) || (complianceFilter === "unpaid" && !isPaid);

      return matchesSearch && matchesClass && matchesSection && matchesCompliance;
    });
  }, [searchTerm, classFilter, sectionFilter, complianceFilter, activeFeeFilter, students]);

  const classDossierStudents = useMemo(() => {
    if (!selectedClassDetails) return [];
    return students.filter((s) => s.class === selectedClassDetails.name);
  }, [students, selectedClassDetails]);

  const handleProcessPayment = async () => {
    if (!paymentForm.amount || !selectedStudentForPayment) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/fees/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentForPayment.id,
          feeType: paymentForm.type,
          amount: parseFloat(paymentForm.amount),
          method: "Desk"
        })
      });

      if (!response.ok) throw new Error("Failed to record payment");

      const data = await response.json();
      setIssuedReceipt(data.receipt);
      setTransactions((prev) => [data.payment, ...prev]);
      setSelectedStudentForPayment(null);
      setPaymentForm({ type: activeFeeFilter, amount: "" });
      toast({ title: "Success", description: "Payment recorded successfully" });
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    window.location.reload();
  };

  if (hasError && !isLoadingFees) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-bold">Failed to Load Data</h2>
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
              <Coins className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline tracking-tighter uppercase">
                {isAdmin ? "Revenue Oversight" : "Collection Desk"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage intake and record payments.</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "oversight" : "ledger"} className="w-full">
        <TabsList className="grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-2xl grid-cols-2 sm:grid-cols-4 sm:w-auto sm:max-w-[900px]">
          {isAdmin && <TabsTrigger value="oversight" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm"><Building2 className="w-4 h-4" /> Oversight</TabsTrigger>}
          {isBursar && <TabsTrigger value="ledger" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm"><Wallet className="w-4 h-4" /> Collection</TabsTrigger>}
          <TabsTrigger value="history" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm"><History className="w-4 h-4" /> History</TabsTrigger>
          {isBursar && <TabsTrigger value="settings" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm"><Settings2 className="w-4 h-4" /> Fee Policy</TabsTrigger>}
        </TabsList>

        {isAdmin && (
          <TabsContent value="oversight" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Intake Analytics</h2>
                <p className="text-xs text-muted-foreground">Audit collection by class level.</p>
              </div>
              {isLoadingFees ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Select value={activeFeeFilter} onValueChange={setActiveFeeFilter}>
                  <SelectTrigger className="w-full md:w-[250px] h-12 bg-primary/5 border-primary/20 text-primary font-bold rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {feeTypes.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLoadingStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-none shadow-sm animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClassStats.map((cls) => (
                  <Card
                    key={cls.name}
                    className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all bg-white cursor-pointer"
                    onClick={() => setSelectedClassDetails(cls)}
                  >
                    <div className={cn("h-1.5 w-full", cls.status === "optimal" ? "bg-green-500" : "bg-amber-500")} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-black text-primary uppercase leading-tight">{cls.name}</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                            <Users className="w-3.5 h-3.5" /> {cls.totalStudents} Students
                          </CardDescription>
                        </div>
                        <Badge className="h-10 w-10 p-0 flex items-center justify-center rounded-xl bg-accent text-primary font-black">
                          {cls.percentage}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center text-xs mb-2">
                          <span className="text-muted-foreground font-bold">Paid Status</span>
                          <span className="font-bold text-primary">
                            {cls.paidCount} / {cls.totalStudents}
                          </span>
                        </div>
                        <Progress value={cls.percentage} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase">Arrears</p>
                          <p className="text-lg font-black text-destructive">{cls.arrears}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase">Revenue</p>
                          <p className="text-lg font-black text-green-600">{cls.revenue}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {isBursar && (
          <TabsContent value="ledger" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-8">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Record Payment</h2>
                <p className="text-xs text-muted-foreground">Process and track student fee collections.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Select Student</Label>
                  {isLoadingStudents ? (
                    <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  ) : (
                    <Select value={selectedStudentForPayment?.id || ""} onValueChange={(v) => setSelectedStudentForPayment(students.find((s) => s.id === v))}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Choose student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.class})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Fee Type</Label>
                  {isLoadingFees ? (
                    <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  ) : (
                    <Select value={paymentForm.type} onValueChange={(v) => setPaymentForm((prev) => ({ ...prev, type: v }))}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Choose fee type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {feeTypes.map((t) => (
                          <SelectItem key={t.id} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="h-12 rounded-xl text-lg font-bold"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 font-black uppercase gap-2 rounded-xl"
                onClick={handleProcessPayment}
                disabled={isProcessing || !selectedStudentForPayment || !paymentForm.amount}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Record Payment
              </Button>
            </div>

            {issuedReceipt && (
              <Dialog defaultOpen onOpenChange={() => setIssuedReceipt(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Payment Receipt</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Student</p>
                      <p className="font-bold">{issuedReceipt.studentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fee Type</p>
                      <p className="font-bold">{issuedReceipt.feeType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-lg font-black text-green-600">{issuedReceipt.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-bold">{issuedReceipt.date}</p>
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

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Payment History</h2>
              <p className="text-xs text-muted-foreground">Recent transactions and records.</p>
            </div>

            {isLoadingTransactions ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-bold">{tx.studentName}</TableCell>
                        <TableCell>{tx.feeType}</TableCell>
                        <TableCell className="font-bold text-green-600">{tx.amount}</TableCell>
                        <TableCell>{tx.method}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {isBursar && (
          <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Fee Types</h2>
                <p className="text-xs text-muted-foreground">Manage institutional fee structure.</p>
              </div>

              {isLoadingFees ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {feeTypes.map((fee) => (
                    <Card key={fee.id} className="border shadow-sm bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{fee.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">{fee.description}</CardDescription>
                          </div>
                          <Badge>{fee.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold text-lg text-primary">{fee.amount?.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
