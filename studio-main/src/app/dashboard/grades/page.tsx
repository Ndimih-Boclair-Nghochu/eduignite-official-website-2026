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
import { gradesService } from "@/lib/api/services/grades.service";
import { studentsService } from "@/lib/api/services/students.service";
import { useSchoolSettings } from "@/lib/hooks/useSchools";

const ACADEMIC_YEARS = ["2023 / 2024", "2022 / 2023", "2021 / 2022"];
const TERMS = ["Term 1", "Term 2", "Term 3"];

function parseSubjectPlacement(level?: string) {
  const raw = (level || "").trim();
  if (!raw) return [];
  if (!raw.includes("||")) {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  const [, classes] = raw.split("||");
  return (classes || "").split(",").map((item) => item.trim()).filter(Boolean);
}

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
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [teacherClassStudents, setTeacherClassStudents] = useState<any[]>([]);
  const [existingGradeMap, setExistingGradeMap] = useState<Record<string, any>>({});
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const [savingGradeFor, setSavingGradeFor] = useState<string | null>(null);

  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";
  const isAdmin = user?.role === "SCHOOL_ADMIN" || user?.role === "SUB_ADMIN";
  const { data: schoolSettings } = useSchoolSettings(user?.school?.id || "");

  const teacherSubjects = useMemo(() => {
    if (!isTeacher) return subjects;
    return subjects.filter((subject: any) => subject.teacher === user?.id || subject.teacher === user?.uid);
  }, [isTeacher, subjects, user?.id, user?.uid]);

  const availableClasses = useMemo(() => {
    const sourceSubjects = isTeacher ? teacherSubjects : subjects;
    const subjectClasses = sourceSubjects.flatMap((subject: any) => parseSubjectPlacement(subject.level));
    const schoolClasses = schoolSettings?.class_levels || [];
    return Array.from(new Set([...subjectClasses, ...schoolClasses].filter(Boolean)));
  }, [isTeacher, schoolSettings?.class_levels, subjects, teacherSubjects]);

  const availableTeacherClasses = useMemo(() => {
    const selected = teacherSubjects.find((subject: any) => subject.id === selectedSubject);
    const scopedClasses = parseSubjectPlacement(selected?.level);
    return scopedClasses.length ? scopedClasses : availableClasses;
  }, [availableClasses, selectedSubject, teacherSubjects]);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const data = await gradesService.getSubjects({ limit: 200 });
        const list = Array.isArray(data) ? data : data?.results || [];
        setSubjects(list);
      } catch (error) {
        console.error("Error loading subjects:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
      }
    };

    loadSubjects();
  }, [toast]);

  useEffect(() => {
    const subjectPool = isTeacher ? teacherSubjects : subjects;
    if (!subjectPool.length) return;
    setSelectedSubject((current) => (
      current && subjectPool.some((subject: any) => subject.id === current) ? current : subjectPool[0].id
    ));
  }, [isTeacher, subjects, teacherSubjects]);

  useEffect(() => {
    const classPool = isTeacher ? availableTeacherClasses : availableClasses;
    if (!classPool.length) return;
    setSelectedClass((current) => (current && classPool.includes(current) ? current : classPool[0]));
  }, [availableClasses, availableTeacherClasses, isTeacher]);

  // Load sequences
  useEffect(() => {
    const loadSequences = async () => {
      try {
        const data = await gradesService.getSequences({ limit: 50 });
        const list = Array.isArray(data) ? data : data?.results || [];
        setSequences(list);
        if (list.length > 0) {
          setSelectedSequence(list[0].id);
        }
      } catch (error) {
        console.error("Error loading sequences:", error);
        toast({ title: "Error", description: "Failed to load sequences", variant: "destructive" });
      }
    };

    loadSequences();
  }, [toast]);

  useEffect(() => {
    if (!isStudent) return;

    const loadStudentProfile = async () => {
      try {
        const data = await studentsService.getStudents({ limit: 1 });
        const list = Array.isArray(data) ? data : data?.results || [];
        setStudentProfile(list[0] || null);
      } catch (error) {
        console.error("Error loading student profile:", error);
      }
    };

    loadStudentProfile();
  }, [isStudent]);

  // Load student's report card
  useEffect(() => {
    if (!isStudent || !selectedSequence || !studentProfile?.id) return;

    const loadReportCard = async () => {
      try {
        const data = await gradesService.getReportCard(studentProfile.id, selectedSequence);
        setReportCard(data);
      } catch (error) {
        console.error("Error loading report card:", error);
        toast({ title: "Error", description: "Failed to load report card", variant: "destructive" });
      }
    };

    loadReportCard();
  }, [isStudent, studentProfile?.id, selectedSequence, toast]);

  // Load class results for teacher
  useEffect(() => {
    if (!isTeacher || !selectedClass || !selectedSequence) return;

    const loadClassResults = async () => {
      try {
        const data = await gradesService.getClassResults(selectedClass, selectedSequence);
        setClassResults(Array.isArray(data) ? data : data?.results || []);
      } catch (error) {
        console.error("Error loading class results:", error);
        toast({ title: "Error", description: "Failed to load class results", variant: "destructive" });
      }
    };

    loadClassResults();
  }, [isTeacher, selectedClass, selectedSequence, toast]);

  useEffect(() => {
    if (!isTeacher || !selectedClass || !selectedSequence || !selectedSubject) {
      setTeacherClassStudents([]);
      setExistingGradeMap({});
      setGradeDrafts({});
      return;
    }

    const loadTeacherGradeSheet = async () => {
      try {
        const studentData = await studentsService.getClassList(selectedClass);
        const studentList = Array.isArray(studentData) ? studentData : studentData?.results || [];
        setTeacherClassStudents(studentList);

        const reportCards = await Promise.all(
          studentList.map(async (student: any) => {
            try {
              const report = await gradesService.getReportCard(student.id, selectedSequence);
              return { studentId: student.id, report };
            } catch (error) {
              return { studentId: student.id, report: null };
            }
          })
        );

        const nextGradeMap: Record<string, any> = {};
        reportCards.forEach(({ studentId, report }) => {
          const gradeEntries = report?.grades || report?.subjects || [];
          const matched = gradeEntries.find((grade: any) =>
            grade?.subject === selectedSubject ||
            grade?.subject?.id === selectedSubject ||
            grade?.subject_id === selectedSubject
          );
          if (matched) {
            nextGradeMap[studentId] = matched;
          }
        });

        setExistingGradeMap(nextGradeMap);
        setGradeDrafts(
          studentList.reduce((acc: Record<string, string>, student: any) => {
            const existing = nextGradeMap[student.id];
            acc[student.id] = existing?.score !== undefined && existing?.score !== null ? String(existing.score) : "";
            return acc;
          }, {})
        );
      } catch (error) {
        console.error("Error loading teacher grade sheet:", error);
        setTeacherClassStudents([]);
        setExistingGradeMap({});
        setGradeDrafts({});
      }
    };

    loadTeacherGradeSheet();
  }, [isTeacher, selectedClass, selectedSequence, selectedSubject]);

  // Load admin view classes
  useEffect(() => {
    if (!isAdmin) return;

    const loadClasses = async () => {
      try {
        setIsLoading(true);
        const data = await studentsService.getStudents({ limit: 500 });
        const students = Array.isArray(data) ? data : data?.results || [];
        const grouped = Object.values(
          students.reduce((acc: Record<string, any>, student: any) => {
            const className = student.student_class || "Unassigned";
            if (!acc[className]) {
              acc[className] = {
                id: className,
                name: className,
                students: 0,
                performance: 0,
                averageMark: 0,
                teachers: 0,
              };
            }
            acc[className].students += 1;
            return acc;
          }, {})
        );
        setClasses(grouped);
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

  const refreshTeacherClassResults = async () => {
    if (!selectedClass || !selectedSequence) return;
    try {
      const data = await gradesService.getClassResults(selectedClass, selectedSequence);
      setClassResults(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.error("Error refreshing class results:", error);
    }
  };

  const handleSaveGrade = async (studentId: string) => {
    const rawValue = gradeDrafts[studentId];
    const score = Number(rawValue);

    if (!selectedSubject || !selectedSequence) {
      toast({ title: "Missing selection", description: "Choose the subject and sequence first.", variant: "destructive" });
      return;
    }

    if (rawValue === undefined || rawValue === "" || Number.isNaN(score) || score < 0 || score > 20) {
      toast({ title: "Invalid grade", description: "Enter a score between 0 and 20.", variant: "destructive" });
      return;
    }

    setSavingGradeFor(studentId);
    try {
      const existingGrade = existingGradeMap[studentId];
      const payload = {
        student: studentId,
        subject: selectedSubject,
        sequence: selectedSequence,
        score,
      };

      const savedGrade = existingGrade?.id
        ? await gradesService.updateGrade(existingGrade.id, payload)
        : await gradesService.createGrade(payload);

      setExistingGradeMap((current) => ({
        ...current,
        [studentId]: savedGrade,
      }));
      setGradeDrafts((current) => ({
        ...current,
        [studentId]: String(savedGrade.score ?? score),
      }));
      await refreshTeacherClassResults();
      toast({ title: "Grade saved", description: "The student's mark has been recorded successfully." });
    } catch (error: any) {
      console.error("Error saving grade:", error);
      toast({
        title: "Failed to save grade",
        description: error?.response?.data?.detail || error?.response?.data?.non_field_errors?.[0] || "Could not save this mark right now.",
        variant: "destructive",
      });
    } finally {
      setSavingGradeFor(null);
    }
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
                    <p className="text-2xl font-black text-primary">
                      {typeof (reportCard.averageMark ?? reportCard.average) === "number"
                        ? (reportCard.averageMark ?? reportCard.average).toFixed(2)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Class Rank</p>
                    <p className="text-2xl font-black text-blue-600">{reportCard.rank || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Status</p>
                    <Badge className={cn("mt-1", (reportCard.status || getSystemStatus(reportCard.average || 0)) === "PASSED" ? "bg-green-600" : "bg-destructive")}>
                      {reportCard.status || getSystemStatus(reportCard.average || 0)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Remark</p>
                    <p className="text-sm font-bold text-primary">{reportCard.remark || getSystemRemark(reportCard.average || 0)}</p>
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
                      {(reportCard.subjects || reportCard.grades || []).map((subject: any) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-bold">{subject.name || subject.subject_name || subject.subject?.name || "Subject"}</TableCell>
                          <TableCell className="text-sm">{subject.teacherName || subject.teacher_name || "N/A"}</TableCell>
                          <TableCell className="font-bold">
                            {typeof (subject.mark ?? subject.score) === "number" ? (subject.mark ?? subject.score).toFixed(2) : "N/A"}
                          </TableCell>
                          <TableCell>{subject.coefficient || subject.subject?.coefficient || "N/A"}</TableCell>
                          <TableCell className="font-bold text-primary">
                            {typeof subject.total === "number" ? subject.total.toFixed(2) : "N/A"}
                          </TableCell>
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
                    {(isTeacher ? teacherSubjects : subjects).map((s) => (
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
                    {(isTeacher ? availableTeacherClasses : availableClasses).map((cls) => (
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
                      {teacherClassStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No students in this class for the selected subject
                          </TableCell>
                        </TableRow>
                      ) : (
                        teacherClassStudents.map((student: any) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-bold">{student.user?.name || student.student_name || "Student"}</TableCell>
                            <TableCell>{existingGradeMap[student.id]?.score ?? "Not set"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="Enter grade"
                                className="w-20 h-8 rounded-lg"
                                max="20"
                                min="0"
                                value={gradeDrafts[student.id] ?? ""}
                                onChange={(e) => setGradeDrafts((current) => ({ ...current, [student.id]: e.target.value }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleSaveGrade(student.id)}
                                disabled={savingGradeFor === student.id}
                              >
                                {savingGradeFor === student.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
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
                        <TableHead>Average</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classResults.map((result: any) => (
                        <TableRow key={result.admission_number || result.student_name}>
                          <TableCell className="font-bold">{result.student_name || result.studentName}</TableCell>
                          <TableCell className="font-bold text-primary">
                            {typeof result.average === "number" ? result.average.toFixed(2) : "N/A"}
                          </TableCell>
                          <TableCell>{result.rank || "N/A"}</TableCell>
                          <TableCell>
                            <Badge className={cn((result.average || 0) >= 10 ? "bg-green-600" : "bg-destructive")}>
                              {getSystemStatus(result.average || 0)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{getSystemRemark(result.average || 0)}</TableCell>
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
