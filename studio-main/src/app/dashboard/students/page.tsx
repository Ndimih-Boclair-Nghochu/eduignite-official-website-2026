"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  User,
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Loader2,
  Info,
  BookOpen,
  Download,
  FileDown,
  Filter,
  GraduationCap,
  BookMarked,
  MoreVertical,
  Pencil,
  UserX,
  UserCheck,
  Eye,
  Heart,
  Mail,
  Smartphone,
  MessageCircle,
  X,
  Network,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Baby,
  Venus,
  Mars,
  Building2,
  Printer,
  QrCode,
  ChevronRight,
  UserRound,
  Fingerprint,
  UsersRound,
  History,
  AlertCircle,
  TrendingUp,
  ArrowUpCircle,
  LogOut,
  UserRoundCheck,
  Zap,
  FileText
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const CLASSES = ["6ème / Form 1", "5ème / Form 2", "4ème / Form 3", "3ème / Form 4", "2nde / Form 5", "1ère / Lower Sixth", "Terminale / Upper Sixth"];
const SECTIONS = ["Anglophone Section", "Francophone Section", "Technical Section"];
const SUBJECTS = ["Advanced Physics", "Mathematics", "General Chemistry", "English Literature", "History"];

// Hooks for API calls (to be implemented in hooks directory)
const useStudents = (params: any) => {
  return useQuery({
    queryKey: ["students", params],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, { params });
      return data;
    },
    initialData: [],
  });
};

const useHonourRoll = () => {
  return useQuery({
    queryKey: ["honour-roll"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/honour-roll`);
      return data;
    },
    initialData: [],
  });
};

const useClassList = (selectedClass: string) => {
  return useQuery({
    queryKey: ["students", selectedClass],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/class/${selectedClass}`);
      return data;
    },
    enabled: selectedClass !== "all",
    initialData: [],
  });
};

const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newStudent: any) => {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students`, newStudent);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

export default function StudentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPromotionProcessing, setIsPromotionProcessing] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);

  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    dob: "",
    gender: "Male",
    region: "Littoral",
    division: "",
    subDivision: "",
    placeOfBirth: "",
    guardianId: "",
    section: "Anglophone Section",
    class: "2nde / Form 5",
  });

  const isAdmin = ["SCHOOL_ADMIN", "SUB_ADMIN"].includes(user?.role || "");
  const isTeacher = user?.role === "TEACHER";

  // Fetch students with filters
  const { data: studentList = [] } = useStudents({
    classFilter: classFilter !== "all" ? classFilter : undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createStudentMutation = useCreateStudent();

  const filteredStudents = useMemo(() => (studentList || []).filter(s => {
    const matchesSearch = (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.id?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesClass = classFilter === "all" || s.class === classFilter;
    const matchesSection = sectionFilter === "all" || s.section === sectionFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSubject = subjectFilter === "all" || s.subjects?.includes(subjectFilter);
    return matchesSearch && matchesClass && matchesSection && matchesStatus && matchesSubject;
  }), [studentList, searchTerm, classFilter, sectionFilter, statusFilter, subjectFilter]);

  const promotionEligible = useMemo(() => (studentList || []).filter(s => s.status === 'active'), [studentList]);

  const handlePromoteStudents = () => {
    setIsPromotionProcessing(true);
    setTimeout(() => {
      setIsPromotionProcessing(false);
      toast({ title: "Promotion Cycle Complete", description: "Eligible students have been advanced." });
    }, 2500);
  };

  const handleWithdrawStudent = (uid: string) => {
    toast({ variant: "destructive", title: "Student Withdrawn" });
  };

  const handleFinalizeAdmission = async () => {
    if (!newStudent.name) return;
    setIsProcessing(true);
    try {
      await createStudentMutation.mutateAsync(newStudent);
      setIsProcessing(false);
      setIsAdmissionOpen(false);
      setNewStudent({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        dob: "",
        gender: "Male",
        region: "Littoral",
        division: "",
        subDivision: "",
        placeOfBirth: "",
        guardianId: "",
        section: "Anglophone Section",
        class: "2nde / Form 5",
      });
      toast({ title: "Student Admitted", description: "New student added successfully." });
    } catch (error) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Error", description: "Failed to create student." });
    }
  };

  const handleExportPDF = () => {
    toast({ title: "PDF Generation Started", description: "Your filtered student list is being processed for download." });
  };

  const handleSaveEdit = () => {
    if (!editingUser.name) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setEditingUser(null);
      toast({ title: "Identity Updated" });
    }, 800);
  };

  if (isAuthLoading) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl shadow-lg">
                <GraduationCap className="w-6 h-6 text-secondary" />
              </div>
              {isTeacher ? "My Students" : "Student Governance"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isTeacher ? "Manage your assigned cohorts and subjects." : "Manage lifecycle from admission to graduation."}
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {isTeacher ? (
            <Button className="flex-1 md:flex-none h-12 rounded-2xl font-bold gap-2 bg-secondary text-primary hover:bg-secondary/90 shadow-lg" onClick={handleExportPDF}>
              <FileText className="w-4 h-4" /> Export Filtered (PDF)
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-2xl font-bold gap-2 border-primary/10 bg-white" onClick={() => toast({ title: "Export Started" })}>
                <FileDown className="w-4 h-4 text-primary" /> Export
              </Button>
              <Button className="flex-[2] md:flex-none gap-2 shadow-lg h-12 px-6 rounded-2xl font-bold" onClick={() => setIsAdmissionOpen(true)}>
                <UserPlus className="w-5 h-5" /> New Admission
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className={cn("grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-3xl", isAdmin ? "grid-cols-2 sm:w-auto sm:max-w-[500px]" : "grid-cols-1 sm:w-auto sm:max-w-[300px]")}>
          <TabsTrigger value="registry" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
            <Users className="w-4 h-4" /> Student Registry
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="promotion" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
              <ArrowUpCircle className="w-4 h-4" /> Promotion Center
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="registry" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-white p-4 rounded-3xl border shadow-sm items-end">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Search Registry</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Name or ID..." className="pl-10 h-11 bg-accent/20 border-none rounded-xl text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            {isTeacher && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">My Subjects</Label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-11 bg-accent/20 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All My Subjects</SelectItem>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Class Level</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-11 bg-accent/20 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire School</SelectItem>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isTeacher && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Lifecycle Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 bg-accent/20 border-none rounded-xl font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Global (All)</SelectItem>
                    <SelectItem value="active">Active Students</SelectItem>
                    <SelectItem value="graduated">Alumni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="h-11 bg-accent/20 border-none rounded-xl font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white">
            <CardContent className="p-0 overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader className="bg-accent/10 uppercase text-[9px] font-black tracking-widest border-b border-accent/20">
                  <TableRow>
                    <TableHead className="pl-8 py-4">Student Profile</TableHead>
                    <TableHead>Academic Level</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {!isTeacher && <TableHead className="text-right pr-8">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s: any) => (
                    <TableRow key={s.uid} className="group hover:bg-accent/5 transition-colors h-16 border-b last:border-0">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-accent shrink-0">
                            <AvatarImage src={s.avatar} alt={s.name} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{s.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-primary leading-none mb-1">{s.name?.split(' ')[0]}</span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{s.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] border-primary/10 text-primary font-bold uppercase">{s.class}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[8px] font-black uppercase px-3 h-5 border-none",
                          s.status === 'active' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {s.status === 'active' ? 'ENROLLED' : 'ALUMNI'}
                        </Badge>
                      </TableCell>
                      {!isTeacher && (
                        <TableCell className="text-right pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5">
                                <MoreVertical className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-none p-2">
                              <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-40 px-3">Governance Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="gap-3 rounded-xl cursor-pointer" onClick={() => router.push(`/dashboard/children/view?id=${s.id}`)}>
                                <Eye className="w-4 h-4 text-primary/60" />
                                <span className="font-bold text-xs">Access Dossier</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 rounded-xl cursor-pointer" onClick={() => setEditingUser({...s})}>
                                <Pencil className="w-4 h-4 text-primary/60" />
                                <span className="font-bold text-xs">Update Profile</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-accent" />
                              <DropdownMenuItem className="text-destructive gap-3 rounded-xl cursor-pointer" onClick={() => handleWithdrawStudent(s.uid)}>
                                <LogOut className="w-4 h-4" />
                                <span className="font-bold text-xs">Formal Withdrawal</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotion" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-primary p-8 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-2xl text-secondary">
                        <ArrowUpCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Promotion Cycle</CardTitle>
                        <CardDescription className="text-white/60">Automated advancement based on 3rd term results.</CardDescription>
                      </div>
                    </div>
                    <Button
                      className="bg-secondary text-primary hover:bg-secondary/90 h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg gap-2"
                      onClick={handlePromoteStudents}
                      disabled={isPromotionProcessing}
                    >
                      {isPromotionProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Execute Promotion
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-accent/10 uppercase text-[9px] font-black tracking-widest">
                      <TableRow>
                        <TableHead className="pl-8 py-4">Student Profile</TableHead>
                        <TableHead>Current Class</TableHead>
                        <TableHead className="text-center">Annual Mean</TableHead>
                        <TableHead className="text-right pr-8">Transition Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promotionEligible.map((s: any) => {
                        const isPassed = (s.annualAvg || 0) >= 10;
                        return (
                          <TableRow key={s.uid} className="hover:bg-accent/5 h-16 border-b last:border-0">
                            <TableCell className="pl-8">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-accent shrink-0">
                                  <AvatarImage src={s.avatar} alt={s.name} />
                                  <AvatarFallback className="bg-primary/5 text-primary text-[8px] font-bold">{s.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-primary uppercase leading-none mb-1">{s.name?.split(' ')[0]}</span>
                                  <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{s.id}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><span className="text-[10px] font-bold uppercase">{s.class}</span></TableCell>
                            <TableCell className="text-center font-black text-primary">{s.annualAvg?.toFixed(2)}</TableCell>
                            <TableCell className="text-right pr-8">
                              <Badge className={cn("text-[8px] font-black uppercase px-2 h-5 border-none", isPassed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                                {isPassed ? 'PROMOTE' : 'REPEATER'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ADMISSION DIALOG */}
      <Dialog open={isAdmissionOpen} onOpenChange={setIsAdmissionOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-8 text-white relative shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl"><UserPlus className="w-8 h-8 text-secondary" /></div>
              <DialogTitle className="text-2xl font-black uppercase">New Student Admission</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsAdmissionOpen(false)} className="absolute top-4 right-4 text-white hover:bg-white/10"><X className="w-6 h-6" /></Button>
          </DialogHeader>
          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Identity Name</Label>
                <Input value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} placeholder="e.g. John Smith" className="h-12 bg-accent/30 border-none rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Class Level</Label>
                <Select value={newStudent.class} onValueChange={(v) => setNewStudent({...newStudent, class: v})}>
                  <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
            <Button className="w-full h-14 rounded-2xl shadow-xl font-black uppercase text-[10px] gap-2 bg-primary text-white" onClick={handleFinalizeAdmission} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Finalize Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle>Edit Student Identity</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editingUser?.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Class Level</Label>
              <Select value={editingUser?.class} onValueChange={(v) => setEditingUser({...editingUser, class: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-6 bg-accent/10 border-t">
            <Button onClick={handleSaveEdit} className="w-full h-12 rounded-xl font-bold" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Identity Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
