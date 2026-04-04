"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Award,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  History,
  FileText,
  User,
  Save,
  ArrowLeft,
  XCircle,
  FileBadge,
  Printer,
  FileDown,
  Download,
  Eye,
  CreditCard,
  QrCode,
  X,
  Building2,
  CalendarDays,
  Info,
  Users,
  LayoutGrid,
  TrendingUp,
  Activity,
  Filter,
  FileSpreadsheet,
  Zap,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const CLASSES = ["6ème / Form 1", "5ème / Form 2", "4ème / Form 3", "3ème / Form 4", "2nde / Form 5", "1ère / Lower Sixth", "Terminale / Upper Sixth"];
const ACADEMIC_YEARS = ["2023 / 2024", "2022 / 2023", "2021 / 2022"];
const TERMS = ["Term 1", "Term 2", "Term 3"];

export default function GradeBookPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedClass, setSelectedClass] = useState("2nde / Form 5");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSequence, setSelectedSequence] = useState("");
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [adminView, setAdminView] = useState<"list" | "details">("list");
  const [inspectedClass, setInspectedClass] = useState<any>(null);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [reportCard, setReportCard] = useState<any>(null);
  const [classResults, setClassResults] = useState<any[]>([]);
  const [annualResults, setAnnualResults] = useState<any[]>([]);

  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";
  const isAdmin = user?.role === "SCHOOL_ADMIN" || user?.role === "SUB_ADMIN";

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await fetch("/api/grades/subjects");
        if (!response.ok) throw new Error("Failed to load subjects");
        const data = await response.json();
        setSubjects(data.subjects || []);
        if (data.subjects?.length > 0) {
          setSelectedSubject(data.subjects[0].id);
        }
      } catch (error) {
        console.error("Error loading subjects:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
      }
    };

    loadSubjects();
  }, [toast]);

  // Load sequences
  useEffect(() => {
    const loadSequences = async () => {
      try {
        const response = await fetch("/api/grades/sequences");
        if (!response.ok) throw new Error("Failed to load sequences");
        const data = await response.json();
        setSequences(data.sequences || []);
        if (data.sequences?.length > 0) {
          setSelectedSequence(data.sequences[0].id);
        }
      } catch (error) {
        console.error("Error loading sequences:", error);
        toast({ title: "Error", description: "Failed to load sequences", variant: "destructive" });
      }
    };

    loadSequences();
  }, [toast]);

  // Load student's report card
  useEffect(() => {
    if (!isStudent || !selectedSequence) return;

    const loadReportCard = async () => {
      try {
        const response = await fetch(`/api/grades/report-card/${user?.uid}/${selectedSequence}`);
        if (!response.ok) throw new Error("Failed to load report card");
        const data = await response.json();
        setReportCard(data);
      } catch (error) {
        console.error("Error loading report card:", error);
        toast({ title: "Error", description: "Failed to load report card", variant: "destructive" });
      }
    };

    loadReportCard();
  }, [isStudent, user?.uid, selectedSequence, toast]);

  // Load class results for teacher
  useEffect(() => {
    if (!isTeacher || !selectedClass || !selectedSequence) return;

    const loadClassResults = async () => {
      try {
        const response = await fetch(`/api/grades/class-results/${selectedClass}/${selectedSequence}`);
        if (!response.ok) throw new Error("Failed to load class results");
        const data = await response.json();
        setClassResults(data.results || []);
      } catch (error) {
        console.error("Error loading class results:", error);
        toast({ title: "Error", description: "Failed to load class results", variant: "destructive" });
      }
    };

    loadClassResults();
  }, [isTeacher, selectedClass, selectedSequence, toast]);

  // Load admin view classes
  useEffect(() => {
    if (!isAdmin) return;

    const loadClasses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/classes");
        if (!response.ok) throw new Error("Failed to load classes");
        const data = await response.json();
        setClasses(data.classes || []);
      } catch (error) {
        console.error("Error loading classes:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load classes", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, [isAdmin, toast]);

  const handleDownload = (title: string) => {
    toast({ title: "Preparation Started", description: `Generating high-fidelity PDF for ${title}...` });
    setTimeout(() => {
      toast({ title: "Download Successful", description: `${title} has been saved to your device.` });
    }, 2000);
  };

  const getSystemStatus = (average: number) => {
    return average >= 10 ? "PASSED" : "FAILED";
  };

  const getSystemRemark = (average: number) => {
    if (average >= 16) return "Excellent Work";
    if (average >= 14) return "Very Good";
    if (average >= 12) return "Good Progress";
    if (average >= 10) return "Fair Effort";
    return "Needs Improvement";
  };

  const handleRetry = () => {
    setHasError(false);
    window.location.reload();
  };

  if (hasError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-bold">Failed to Load Grades</h2>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button onClick={handleRetry}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  // Admin View
  if (isAdmin) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Academic Governance</h1>
            <p className="text-muted-foreground mt-1 text-sm">Audit class-level report cards and pedagogical performance.</p>
          </div>
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold bg-white" onClick={() => handleDownload("Global Performance Audit")}>
            <FileDown className="w-4 h-4 mr-2" /> Global Audit
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all bg-white cursor-pointer"
                onClick={() => {
                  setInspectedClass(cls);
                  setAdminView("details");
                }}
              >
                <div className={cn("h-1.5 w-full", cls.performance >= 80 ? "bg-green-500" : "bg-amber-500")} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-black text-primary uppercase leading-tight">{cls.name}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                    <Users className="w-3.5 h-3.5" /> {cls.students} Students
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-muted-foreground font-bold">Academic Performance</span>
                      <span className="font-bold text-primary">{cls.performance}%</span>
                    </div>
                    <Progress value={cls.performance} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">Avg Mark</p>
                      <p className="text-lg font-black text-primary">{cls.averageMark?.toFixed(1) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">Teachers</p>
                      <p className="text-lg font-black text-blue-600">{cls.teachers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Student View
  if (isStudent) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">My Grades</h1>
            <p className="text-muted-foreground mt-1 text-sm">View your academic performance and report cards.</p>
          </div>
          {reportCard && (
            <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={() => handleDownload("My Report Card")}>
              <Download className="w-4 h-4 mr-2" /> Download Report
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase">Select Sequence</Label>
          <Select value={selectedSequence} onValueChange={setSelectedSequence}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="Choose sequence..." />
            </SelectTrigger>
            <SelectContent>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!reportCard ? (
          <div className="text-center py-12 text-muted-foreground">Select a sequence to view your grades</div>
        ) : (
          <div className="space-y-6">
            {/* Report Card Summary */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle>Overall Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Average Mark</p>
                    <p className="text-2xl font-black text-primary">{reportCard.averageMark?.toFixed(2) || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Class Rank</p>
                    <p className="text-2xl font-black text-blue-600">{reportCard.rank || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Status</p>
                    <Badge className={cn("mt-1", reportCard.status === "PASSED" ? "bg-green-600" : "bg-destructive")}>
                      {reportCard.status || "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Remark</p>
                    <p className="text-sm font-bold text-primary">{reportCard.remark || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grades Table */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader>
                <CardTitle>Subject Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Mark</TableHead>
                        <TableHead>Coefficient</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportCard.subjects?.map((subject: any) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-bold">{subject.name}</TableCell>
                          <TableCell className="text-sm">{subject.teacherName}</TableCell>
                          <TableCell className="font-bold">{subject.mark?.toFixed(2) || "N/A"}</TableCell>
                          <TableCell>{subject.coefficient || "N/A"}</TableCell>
                          <TableCell className="font-bold text-primary">{subject.total?.toFixed(2) || "N/A"}</TableCell>
                          <TableCell className="text-sm">{subject.rank || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Teacher View
  if (isTeacher) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Grade Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Record and manage student grades.</p>
          </div>
        </div>

        <Tabs defaultValue="entry" className="w-full">
          <TabsList className="grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-2xl grid-cols-2">
            <TabsTrigger value="entry" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <Award className="w-4 h-4" /> Grade Entry
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <LayoutGrid className="w-4 h-4" /> Class Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Sequence</Label>
                <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose sequence..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle>Enter Student Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Current Grade</TableHead>
                        <TableHead>New Grade</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No students in this class for the selected subject
                          </TableCell>
                        </TableRow>
                      ) : (
                        classResults.map((result: any) => (
                          <TableRow key={result.studentId}>
                            <TableCell className="font-bold">{result.studentName}</TableCell>
                            <TableCell>{result.currentGrade || "Not set"}</TableCell>
                            <TableCell>
                              <Input type="number" placeholder="Enter grade" className="w-20 h-8 rounded-lg" max="20" />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="text-xs">
                                Save
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader>
                <CardTitle>Class Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Mark</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classResults.map((result: any) => (
                        <TableRow key={result.studentId}>
                          <TableCell className="font-bold">{result.studentName}</TableCell>
                          <TableCell className="font-bold text-primary">{result.mark?.toFixed(2) || "N/A"}</TableCell>
                          <TableCell>
                            <Badge className={cn(result.status === "PASSED" ? "bg-green-600" : "bg-destructive")}>
                              {result.status || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{result.remark || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return null;
}
