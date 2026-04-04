"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  ArrowRight,
  FileDown,
  Eye,
  CalendarDays,
  ArrowLeft,
  Loader2,
  Save,
  Check,
  X,
  Award,
  Zap,
  Pencil,
  XCircle,
  Users,
  LayoutGrid,
  Activity,
  TrendingUp,
  Filter,
  Search,
  User,
  Printer,
  QrCode,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const CLASSES = ["6ème / Form 1", "5ème / Form 2", "4ème / Form 3", "3ème / Form 4", "2nde / Form 5", "1ère / Lower Sixth", "Terminale / Upper Sixth"];

export default function AttendancePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState<any[]>([]);
  const [absentToday, setAbsentToday] = useState<any[]>([]);
  const [classAttendanceReport, setClassAttendanceReport] = useState<any[]>([]);
  const [studentSummary, setStudentSummary] = useState<any>(null);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkAttendanceData, setBulkAttendanceData] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";
  const isAdmin = user?.role === "SCHOOL_ADMIN" || user?.role === "SUB_ADMIN";

  // Load attendance data based on role
  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setHasError(false);

        if (isStudent) {
          // Load student's own attendance
          const response = await fetch("/api/attendance/my-attendance");
          if (!response.ok) throw new Error("Failed to load attendance");
          const data = await response.json();
          setMyAttendance(data.records || []);

          // Load student's summary
          const summaryResponse = await fetch("/api/attendance/summary");
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            setStudentSummary(summaryData);
          }
        } else if (isTeacher) {
          // Load sessions for teacher
          const response = await fetch("/api/attendance/sessions");
          if (!response.ok) throw new Error("Failed to load sessions");
          const data = await response.json();
          setAttendanceSessions(data.sessions || []);
        } else if (isAdmin) {
          // Load full attendance report
          const response = await fetch("/api/attendance/records");
          if (!response.ok) throw new Error("Failed to load records");
          const data = await response.json();
          setAttendanceRecords(data.records || []);

          // Load today's absent
          const absentResponse = await fetch("/api/attendance/absent-today");
          if (absentResponse.ok) {
            const absentData = await absentResponse.json();
            setAbsentToday(absentData.students || []);
          }
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load attendance data", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendanceData();
  }, [isStudent, isTeacher, isAdmin, toast]);

  const handleRecordAttendance = async (studentId: string, status: string) => {
    setBulkAttendanceData((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedClass) {
      toast({ title: "Error", description: "Please select a class", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/attendance/bulk-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          records: bulkAttendanceData
        })
      });

      if (!response.ok) throw new Error("Failed to record attendance");

      const data = await response.json();
      setAttendanceSessions([data.session, ...attendanceSessions]);
      setBulkAttendanceData({});
      toast({ title: "Success", description: "Attendance recorded successfully" });
    } catch (error) {
      console.error("Error recording attendance:", error);
      toast({ title: "Error", description: "Failed to record attendance", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClassReport = async () => {
    if (!selectedClass || !dateFrom || !dateTo) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/attendance/class-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass,
          dateFrom,
          dateTo
        })
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const data = await response.json();
      setClassAttendanceReport(data.report || []);
      toast({ title: "Success", description: "Report generated" });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Error", description: "Failed to generate report", variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
        <h2 className="text-lg font-bold">Failed to Load Attendance</h2>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button onClick={handleRetry}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  // Student View
  if (isStudent) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">My Attendance</h1>
            <p className="text-muted-foreground mt-1 text-sm">View your attendance record and percentage.</p>
          </div>
        </div>

        {studentSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-bold">Attendance Rate</p>
                <p className="text-3xl font-black text-primary">{studentSummary.percentage || 0}%</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-bold">Present</p>
                <p className="text-3xl font-black text-green-600">{studentSummary.present || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-bold">Absent</p>
                <p className="text-3xl font-black text-destructive">{studentSummary.absent || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-bold">Total Sessions</p>
                <p className="text-3xl font-black text-blue-600">{studentSummary.total || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : myAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No attendance records yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAttendance.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-bold">{record.date}</TableCell>
                        <TableCell>{record.subject}</TableCell>
                        <TableCell className="text-sm">{record.teacherName}</TableCell>
                        <TableCell>
                          <Badge className={cn(record.status === "present" ? "bg-green-600" : record.status === "absent" ? "bg-destructive" : "bg-amber-500")}>
                            {record.status?.toUpperCase() || "N/A"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Teacher View
  if (isTeacher) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Mark Attendance</h1>
            <p className="text-muted-foreground mt-1 text-sm">Record student attendance for your classes.</p>
          </div>
        </div>

        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-2xl grid-cols-2">
            <TabsTrigger value="record" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4" /> Record Attendance
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <History className="w-4 h-4" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label className="text-xs font-bold uppercase">Date</Label>
                  <Input
                    type="date"
                    className="h-12 rounded-xl"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              <Card className="border-none shadow-sm bg-white/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Mark Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Students would be loaded from API based on selected class */}
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Select a class to view students
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full h-12 font-black uppercase gap-2 rounded-xl"
                onClick={handleSubmitAttendance}
                disabled={isProcessing || !selectedClass}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Attendance
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No attendance sessions yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceSessions.map((session: any) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-bold">{session.date}</TableCell>
                            <TableCell>{session.className}</TableCell>
                            <TableCell>{session.subject}</TableCell>
                            <TableCell className="font-bold text-green-600">{session.present}</TableCell>
                            <TableCell className="font-bold text-destructive">{session.absent}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Admin View
  if (isAdmin) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Attendance Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Monitor attendance across all classes.</p>
          </div>
        </div>

        {absentToday.length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive">Today's Absences ({absentToday.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {absentToday.map((student: any) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-destructive/20">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.class}</p>
                      </div>
                    </div>
                    <Badge variant="destructive">Absent</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="report" className="w-full">
          <TabsList className="grid w-full mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-2xl grid-cols-2">
            <TabsTrigger value="report" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <FileDown className="w-4 h-4" /> Attendance Report
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm">
              <History className="w-4 h-4" /> Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
              <h2 className="text-lg font-bold">Generate Class Report</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">From Date</Label>
                  <Input type="date" className="h-12 rounded-xl" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">To Date</Label>
                  <Input type="date" className="h-12 rounded-xl" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>

              <Button
                className="w-full h-12 font-black uppercase gap-2 rounded-xl"
                onClick={handleClassReport}
                disabled={isProcessing || !selectedClass || !dateFrom || !dateTo}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Generate Report
              </Button>

              {classAttendanceReport.length > 0 && (
                <Card className="border-none shadow-sm bg-white/50 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Report Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Present</TableHead>
                            <TableHead>Absent</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classAttendanceReport.map((student: any) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-bold">{student.name}</TableCell>
                              <TableCell className="text-green-600 font-bold">{student.present}</TableCell>
                              <TableCell className="text-destructive font-bold">{student.absent}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={student.percentage} className="w-16 h-2" />
                                  <span className="text-sm font-bold">{student.percentage}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle>All Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No attendance records yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Teacher</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-bold">{record.studentName}</TableCell>
                            <TableCell>{record.className}</TableCell>
                            <TableCell className="text-sm">{record.date}</TableCell>
                            <TableCell>
                              <Badge className={cn(record.status === "present" ? "bg-green-600" : record.status === "absent" ? "bg-destructive" : "bg-amber-500")}>
                                {record.status?.toUpperCase() || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{record.teacherName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return null;
}
