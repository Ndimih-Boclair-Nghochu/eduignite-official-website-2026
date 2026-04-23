"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useStudents } from "@/lib/hooks/useStudents";
import {
  useCreateFeeStructure,
  useCreatePayment,
  useFeeStructures,
  useOutstandingFees,
  usePayments,
  useRevenueReport,
} from "@/lib/hooks/useFees";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  Receipt,
  RotateCcw,
  Settings2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const DEFAULT_CURRENCY = "XAF";

type StudentOption = {
  id: string;
  userId: string;
  name: string;
  studentClass: string;
};

function formatMoney(value: number | string | undefined, currency = DEFAULT_CURRENCY) {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString()}`;
}

function normalizeDate(value?: string) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function FeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const isBursar = user?.role === "BURSAR";
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const isSubAdmin = user?.role === "SUB_ADMIN";
  const isAdmin = isSchoolAdmin || isSubAdmin;

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedFeeStructureId, setSelectedFeeStructureId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Mobile Money" | "Bank Transfer" | "Cheque">("Cash");
  const [notes, setNotes] = useState("");
  const [markLicensePaid, setMarkLicensePaid] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [newFeeStructure, setNewFeeStructure] = useState({
    name: "",
    role: "STUDENT",
    amount: "",
    currency: DEFAULT_CURRENCY,
    academic_year: "",
    due_date: "",
    description: "",
    is_mandatory: true,
  });

  const feeStructuresQuery = useFeeStructures({ limit: 200 });
  const studentsQuery = useStudents({ limit: 500, ordering: "user__name" });
  const paymentsQuery = usePayments({ limit: 200 });
  const revenueQuery = useRevenueReport();
  const outstandingQuery = useOutstandingFees();

  const createPaymentMutation = useCreatePayment();
  const createFeeStructureMutation = useCreateFeeStructure();

  const feeStructures = feeStructuresQuery.data?.results ?? [];
  const payments = paymentsQuery.data?.results ?? [];
  const students = studentsQuery.data?.results ?? [];
  const outstandingFees = Array.isArray(outstandingQuery.data) ? outstandingQuery.data : [];

  const studentOptions = useMemo<StudentOption[]>(
    () =>
      students.map((student) => ({
        id: student.id,
        userId: student.user?.id || "",
        name: student.user?.name || student.admission_number,
        studentClass: student.student_class || "Unassigned",
      })),
    [students]
  );

  const selectedStudent = studentOptions.find((student) => student.id === selectedStudentId) || null;
  const selectedFeeStructure = feeStructures.find((fee) => fee.id === selectedFeeStructureId) || null;

  const feeDistribution = useMemo(
    () =>
      Object.entries(revenueQuery.data?.by_fee_type || {}).map(([name, value]) => ({
        name,
        value: Number(value || 0),
      })),
    [revenueQuery.data]
  );

  const totalFeeDistribution = feeDistribution.reduce((sum, item) => sum + item.value, 0);

  const retryAll = async () => {
    await Promise.allSettled([
      feeStructuresQuery.refetch(),
      studentsQuery.refetch(),
      paymentsQuery.refetch(),
      revenueQuery.refetch(),
      outstandingQuery.refetch(),
    ]);
  };

  const handleRecordPayment = async () => {
    if (!selectedStudent?.userId || !selectedFeeStructureId || !amount.trim()) {
      toast({
        variant: "destructive",
        title: "Incomplete payment",
        description: "Select a student, select a fee type, and enter the amount before recording the payment.",
      });
      return;
    }

    try {
      const created = await createPaymentMutation.mutateAsync({
        payer: selectedStudent.userId,
        fee_structure: selectedFeeStructureId,
        amount,
        currency: selectedFeeStructure?.currency || DEFAULT_CURRENCY,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        license_beneficiary: markLicensePaid ? selectedStudent.userId : undefined,
        mark_license_paid: markLicensePaid,
      });

      setPaymentResult({
        reference: created.reference_number,
        amount: created.amount,
        studentName: created.payer_name || selectedStudent.name,
        feeName: created.fee_structure_detail?.name || selectedFeeStructure?.name || "Fee payment",
        paymentMethod: created.payment_method,
        createdAt: created.created || created.payment_date,
      });
      setAmount("");
      setNotes("");
      setMarkLicensePaid(false);
      toast({
        title: "Payment recorded",
        description: "The transaction has been saved with the real backend payment service.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: getApiErrorMessage(error, "We could not record this payment."),
      });
    }
  };

  const handleCreateFeeStructure = async () => {
    if (!newFeeStructure.name.trim() || !newFeeStructure.amount.trim() || !newFeeStructure.academic_year.trim()) {
      toast({
        variant: "destructive",
        title: "Incomplete fee structure",
        description: "Name, amount, and academic year are required before a fee structure can be saved.",
      });
      return;
    }

    try {
      await createFeeStructureMutation.mutateAsync({
        ...newFeeStructure,
        amount: newFeeStructure.amount,
        due_date: newFeeStructure.due_date || undefined,
      } as any);
      setNewFeeStructure({
        name: "",
        role: "STUDENT",
        amount: "",
        currency: DEFAULT_CURRENCY,
        academic_year: "",
        due_date: "",
        description: "",
        is_mandatory: true,
      });
      toast({
        title: "Fee structure saved",
        description: "The fee policy now comes from the real school fee backend.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save fee structure",
        description: getApiErrorMessage(error, "The fee structure could not be created."),
      });
    }
  };

  const anyError =
    feeStructuresQuery.isError ||
    studentsQuery.isError ||
    paymentsQuery.isError ||
    revenueQuery.isError ||
    outstandingQuery.isError;

  if (anyError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-bold">Failed to load finance data</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          One or more finance services could not be reached. Retry after confirming the backend is running.
        </p>
        <Button onClick={retryAll}>
          <RotateCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const defaultTab = isBursar ? "collection" : "overview";

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border-2 border-white bg-primary p-3 shadow-xl">
              <Coins className="h-6 w-6 text-secondary md:h-8 md:w-8" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-bold uppercase tracking-tighter text-primary md:text-3xl">
                {isBursar ? "Collection Desk" : "Fees & Finance"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                Live fee structures, revenue summaries, outstanding accounts, and verified payment records.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border bg-white p-1.5 shadow-sm sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2 rounded-xl py-3 text-xs font-bold sm:text-sm">
            <TrendingUp className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="collection" className="gap-2 rounded-xl py-3 text-xs font-bold sm:text-sm">
            <Wallet className="h-4 w-4" /> Collection
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 rounded-xl py-3 text-xs font-bold sm:text-sm">
            <Receipt className="h-4 w-4" /> History
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-xl py-3 text-xs font-bold sm:text-sm">
            <Settings2 className="h-4 w-4" /> Fee Policy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Collected",
                value: formatMoney(revenueQuery.data?.total_collected),
                icon: Coins,
              },
              {
                label: "Pending Amount",
                value: formatMoney(revenueQuery.data?.total_pending),
                icon: CreditCard,
              },
              {
                label: "Fee Structures",
                value: String(feeStructures.length),
                icon: Building2,
              },
              {
                label: "Outstanding Accounts",
                value: String(outstandingFees.length),
                icon: Users,
              },
            ].map((card) => (
              <Card key={card.label} className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <card.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-primary">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-primary">Fee Distribution</CardTitle>
                <CardDescription>Real revenue totals grouped by fee type from the backend report.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feeDistribution.length ? (
                  feeDistribution.map((item) => {
                    const percent = totalFeeDistribution ? Math.round((item.value / totalFeeDistribution) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-primary">{item.name}</span>
                          <span className="text-muted-foreground">{formatMoney(item.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-accent/40">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No confirmed fee revenue has been recorded yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-primary">Outstanding Accounts</CardTitle>
                <CardDescription>Users in the school who still have unpaid mandatory fee structures.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {outstandingFees.length ? (
                  outstandingFees.slice(0, 6).map((entry: any) => (
                    <div key={`${entry.user_id}-${entry.user_name}`} className="rounded-2xl border bg-accent/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-primary">{entry.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Paid {formatMoney(entry.total_paid)} of {formatMoney(entry.total_owed)}
                          </p>
                        </div>
                        <Badge variant="secondary">{Number(entry.compliance_percentage || 0).toFixed(0)}%</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No outstanding fee accounts were returned.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collection" className="mt-6 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Record Payment</CardTitle>
              <CardDescription>
                This screen now posts payments through the real finance API instead of the old local frontend endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentOptions.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.studentClass})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fee Structure</Label>
                <Select value={selectedFeeStructureId} onValueChange={setSelectedFeeStructureId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose a fee type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {feeStructures.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {fee.name} ({formatMoney(fee.amount, fee.currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Internal Notes</Label>
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="Optional receipt or desk note"
                />
              </div>

              <div className="flex items-center space-x-3 md:col-span-2">
                <Checkbox
                  id="license-paid"
                  checked={markLicensePaid}
                  onCheckedChange={(checked) => setMarkLicensePaid(Boolean(checked))}
                />
                <Label htmlFor="license-paid" className="cursor-pointer">
                  Mark this student's platform license as paid with this transaction
                </Label>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <Button
                className="h-12 w-full rounded-xl font-black uppercase"
                onClick={handleRecordPayment}
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Record Payment
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Payment History</CardTitle>
              <CardDescription>Verified transactions returned by the backend payment registry.</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : payments.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payer</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-bold text-primary">{payment.payer_name || payment.payer?.name || "Unknown"}</TableCell>
                        <TableCell>{payment.fee_name || payment.fee_structure?.name || "General payment"}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.reference_number}</TableCell>
                        <TableCell>{formatMoney(payment.amount, payment.currency)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{normalizeDate(payment.payment_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-sm text-muted-foreground">No finance transactions have been recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Fee Structures</CardTitle>
              <CardDescription>Live fee policy records attached to the school.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feeStructures.length ? (
                feeStructures.map((fee) => (
                  <div key={fee.id} className="rounded-2xl border bg-accent/10 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-primary">{fee.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fee.role} • {fee.academic_year} • Due {fee.due_date || "not set"}
                        </p>
                      </div>
                      <Badge>{formatMoney(fee.amount, fee.currency)}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No fee structures have been created yet.</p>
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-primary">Create Fee Structure</CardTitle>
                <CardDescription>School administrators can define real fee policies directly on the backend.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newFeeStructure.name}
                    onChange={(event) => setNewFeeStructure((current) => ({ ...current, name: event.target.value }))}
                    className="h-12 rounded-xl"
                    placeholder="Tuition Fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newFeeStructure.role}
                    onValueChange={(value) => setNewFeeStructure((current) => ({ ...current, role: value }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="PARENT">Parent</SelectItem>
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                      <SelectItem value="BURSAR">Bursar</SelectItem>
                      <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                      <SelectItem value="SCHOOL_ADMIN">School Admin</SelectItem>
                      <SelectItem value="SUB_ADMIN">Sub Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.amount}
                    onChange={(event) => setNewFeeStructure((current) => ({ ...current, amount: event.target.value }))}
                    className="h-12 rounded-xl"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    value={newFeeStructure.academic_year}
                    onChange={(event) => setNewFeeStructure((current) => ({ ...current, academic_year: event.target.value }))}
                    className="h-12 rounded-xl"
                    placeholder="2026/2027"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newFeeStructure.due_date}
                    onChange={(event) => setNewFeeStructure((current) => ({ ...current, due_date: event.target.value }))}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={newFeeStructure.currency}
                    onChange={(event) => setNewFeeStructure((current) => ({ ...current, currency: event.target.value }))}
                    className="h-12 rounded-xl"
                    placeholder={DEFAULT_CURRENCY}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={newFeeStructure.description}
                    onChange={(event) => setNewFeeStructure((current) => ({ ...current, description: event.target.value }))}
                    className="h-12 rounded-xl"
                    placeholder="Optional policy details"
                  />
                </div>
                <div className="flex items-center space-x-3 md:col-span-2">
                  <Checkbox
                    id="mandatory-fee"
                    checked={newFeeStructure.is_mandatory}
                    onCheckedChange={(checked) =>
                      setNewFeeStructure((current) => ({ ...current, is_mandatory: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="mandatory-fee" className="cursor-pointer">
                    This fee is mandatory
                  </Label>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Button
                  className="h-12 w-full rounded-xl font-black uppercase"
                  onClick={handleCreateFeeStructure}
                  disabled={createFeeStructureMutation.isPending}
                >
                  {createFeeStructureMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings2 className="mr-2 h-4 w-4" />
                  )}
                  Save Fee Structure
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!paymentResult} onOpenChange={(open) => !open && setPaymentResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Saved</DialogTitle>
            <DialogDescription>The transaction was accepted by the backend finance service.</DialogDescription>
          </DialogHeader>
          {paymentResult && (
            <div className="space-y-3 py-2 text-sm">
              <div>
                <p className="text-muted-foreground">Student</p>
                <p className="font-bold text-primary">{paymentResult.studentName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fee Type</p>
                <p className="font-bold text-primary">{paymentResult.feeName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reference</p>
                <p className="font-mono text-xs">{paymentResult.reference}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-bold text-primary">{formatMoney(paymentResult.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recorded At</p>
                <p className="font-bold text-primary">{normalizeDate(paymentResult.createdAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPaymentResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
