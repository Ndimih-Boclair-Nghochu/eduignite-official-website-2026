
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useSequences, useSubjects, useActiveSequence } from "@/lib/hooks/useGrades";
import { useStudents } from "@/lib/hooks/useStudents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  PenTool, 
  Clock, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Plus, 
  ChevronRight, 
  Timer,
  BookOpen,
  FileText,
  Printer,
  Users,
  TrendingUp,
  User,
  XCircle,
  BarChart3,
  ArrowLeft,
  ChevronLeft,
  MapPin,
  ShieldCheck,
  Building2,
  CalendarDays,
  LayoutGrid,
  Zap,
  Info,
  History,
  AlertCircle,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";

// Mock Subjects for Automatic Teacher Suggestion
const SUBJECT_METADATA = [
  { name: "Mathematics", teacher: "Prof. Sarah Smith", id: "MAT101" },
  { name: "Advanced Physics", teacher: "Dr. Aris Tesla", id: "PHY101" },
  { name: "English Literature", teacher: "Ms. Bennet", id: "LIT101" },
  { name: "General Chemistry", teacher: "Dr. White", id: "CHM101" },
];

const ANGLOPHONE_CLASSES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Lower Sixth", "Upper Sixth"];
const FRANCOPHONE_CLASSES = ["6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"];
const TECHNICAL_CLASSES = ["1ère Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "6th Year", "7th Year"];

const ALL_CLASSES = [...ANGLOPHONE_CLASSES, ...FRANCOPHONE_CLASSES, ...TECHNICAL_CLASSES];

const ROOM_CATEGORIES = [
  { label: "Main Halls", rooms: ["Hall A", "Hall B", "Grand Auditorium"] },
  { label: "Laboratories", rooms: ["Science Lab 1", "Chemistry Wing", "Tech Workshop"] },
  { label: "Standard Classrooms", rooms: ["Room 402", "Room 305", "Library Wing"] },
];

const EXAM_TYPES = ["Sequence Assessment", "Mid-Term Evaluation", "End of Term Examination", "Mock Exam"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = ["08:00 AM", "09:30 AM", "11:00 AM", "01:00 PM", "02:30 PM"];

const MOCK_ONLINE_EXAMS = [
  { 
    id: "E001", 
    title: "Quantum Mechanics Mid-Term", 
    subject: "Advanced Physics", 
    teacher: "Dr. Tesla", 
    startTime: new Date(Date.now() + 86400000).toISOString(), 
    endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    duration: 45, 
    questionCount: 20,
    status: "upcoming",
    instructions: "1. Ensure a stable internet connection. 2. Diagrams must be studied carefully before answering. 3. No external calculators allowed."
  },
  { 
    id: "E002", 
    title: "Calculus Differentiation Quiz", 
    subject: "Mathematics", 
    teacher: "Prof. Smith", 
    startTime: new Date(Date.now() - 1800000).toISOString(), 
    endTime: new Date(Date.now() + 1800000).toISOString(), 
    duration: 30, 
    questionCount: 15,
    status: "active",
    instructions: "Answer all questions correctly. Focus on limits and derivatives."
  },
  { 
    id: "E003", 
    title: "English Vocabulary Speedrun", 
    subject: "English Literature", 
    teacher: "Ms. Bennet", 
    startTime: new Date(Date.now() - 7200000).toISOString(), 
    endTime: new Date(Date.now() - 3600000).toISOString(), 
    duration: 15, 
    questionCount: 10,
    status: "cancelled",
    instructions: "Cancelled due to technical maintenance."
  }
];

const MOCK_EXAM_HISTORY = [
  { id: "H1", title: "Wave Motion Quiz", subject: "Physics", score: 18, total: 20, date: "May 12, 2024", teacher: "Dr. Tesla", status: "VERIFIED" },
  { id: "H2", title: "Algebra Sequence 1", subject: "Mathematics", score: 15, total: 20, date: "April 28, 2024", teacher: "Prof. Smith", status: "VERIFIED" },
  { id: "H3", title: "Inorganic Chemistry", subject: "Chemistry", score: 0, total: 20, date: "Yesterday", teacher: "Dr. White", status: "ABSENT" },
];

const INITIAL_ONSITE_EXAMS = [
  { id: 'OE1', title: 'Mathematics Paper 1', class: 'Form 5', room: 'Hall A', date: '2024-06-10', time: '08:00 AM', teacher: 'Prof. Sarah Smith', section: "Anglophone Section", status: 'Scheduled' },
];

export default function ExamsPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isDrawingTimetable, setIsDrawingTimetable] = useState(false);
  const [isSchedulingOnsite, setIsSchedulingOnsite] = useState(false);
  const [viewingInstructions, setViewingInstructions] = useState<any>(null);
  const [onsiteExams, setOnsiteExams] = useState(INITIAL_ONSITE_EXAMS);
  
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const isSubAdmin = user?.role === "SUB_ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isAdmin = isSchoolAdmin || isSubAdmin;
  const isStudent = user?.role === "STUDENT";

  const canScheduleExams = isSchoolAdmin || isSubAdmin || isTeacher;

  // Fetch real subjects and sequences from API
  const { data: subjectsData } = useSubjects();
  const { data: sequencesData } = useSequences();
  const { data: activeSequenceData } = useActiveSequence();

  // Build onsite exams from real sequences data
  useEffect(() => {
    if (sequencesData?.results?.length) {
      const fromApi = sequencesData.results.map((seq: any) => ({
        id: seq.id,
        title: seq.name,
        type: "Sequence Assessment",
        subject: "All Subjects",
        class: "All Classes",
        room: "TBD",
        date: seq.start_date,
        time: "08:00",
        teacher: "Various",
        status: seq.is_active ? "scheduled" : "completed",
        instructions: `Term ${seq.term} sequence assessment for academic year ${seq.academic_year}.`,
      }));
      setOnsiteExams(fromApi);
    }
  }, [sequencesData]);

  // Real subjects for teacher filtering (with mock fallback)
  const teacherSubjectNames = useMemo(() => {
    if (isTeacher && subjectsData?.results) {
      return subjectsData.results
        .filter((s: any) => s.teacher === user?.name || s.teacher === user?.id)
        .map((s: any) => s.name);
    }
    return ["Advanced Physics", "General Chemistry"]; // fallback
  }, [isTeacher, subjectsData, user]);

  const availableClasses = useMemo(() => {
    if (isSchoolAdmin) return ALL_CLASSES;
    if (isSubAdmin) {
      // Mock sub-admin section assignment
      const subAdminSection = "Anglophone Section";
      if (subAdminSection === "Anglophone Section") return ANGLOPHONE_CLASSES;
      if (subAdminSection === "Francophone Section") return FRANCOPHONE_CLASSES;
      if (subAdminSection === "Technical Section") return TECHNICAL_CLASSES;
    }
    return ALL_CLASSES;
  }, [isSchoolAdmin, isSubAdmin]);

  const filteredSubjects = useMemo(() => {
    if (isTeacher) {
      return SUBJECT_METADATA.filter(s => teacherSubjectNames.includes(s.name));
    }
    return SUBJECT_METADATA;
  }, [isTeacher]);

  const [timetableFormData, setTimetableFormData] = useState({
    class: "",
    subject: "",
    day: "",
    time: "",
    room: "",
    teacher: ""
  });

  const [onsiteFormData, setOnsiteFormData] = useState({
    title: "",
    type: "Sequence Assessment",
    subject: "",
    class: "",
    room: "",
    date: "",
    time: "",
    teacher: ""
  });

  const filteredOnsiteExams = useMemo(() => {
    if (isSchoolAdmin || isStudent) return onsiteExams;
    if (isTeacher) return onsiteExams.filter((e: any) => teacherSubjectNames.includes(e.subject));
    return onsiteExams;
  }, [onsiteExams, isSchoolAdmin, isStudent, isTeacher]);

  const currentTime = new Date();
  const activeExams = MOCK_ONLINE_EXAMS.filter(exam => {
    const end = new Date(exam.endTime);
    return end > currentTime && exam.status !== 'cancelled';
  });

  useEffect(() => {
    const allSubjects = subjectsData?.results || SUBJECT_METADATA;
    const meta = allSubjects.find((s: any) => s.name === timetableFormData.subject);
    if (meta) {
      setTimetableFormData(prev => ({ ...prev, teacher: meta.teacher }));
    }
  }, [timetableFormData.subject]);

  useEffect(() => {
    const allSubjects2 = subjectsData?.results || SUBJECT_METADATA;
    const meta = allSubjects2.find((s: any) => s.name === onsiteFormData.subject);
    if (meta) {
      setOnsiteFormData(prev => ({ ...prev, teacher: meta.teacher }));
    }
  }, [onsiteFormData.subject]);

  const handleScheduleOnsite = () => {
    const newExam = {
      id: `OE-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      ...onsiteFormData,
      section: isTeacher ? "Personal Subject" : "Institution Wide",
      status: 'Scheduled'
    };
    setOnsiteExams(prev => [newExam, ...prev]);
    setIsSchedulingOnsite(false);
    toast({ title: "Onsite Exam Scheduled", description: `${onsiteFormData.teacher} assigned as invigilator.` });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'ABSENT': return <XCircle className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'VERIFIED': return "bg-green-100 text-green-700";
      case 'ABSENT': return "bg-red-100 text-red-700";
      default: return "";
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl shadow-lg">
                <PenTool className="w-6 h-6 text-secondary" />
              </div>
              {isStudent ? (language === 'en' ? 'Examinations' : 'Examens') : (language === 'en' ? 'Institutional Schedules' : 'Calendrier Institutionnel')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isStudent 
                ? (language === 'en' ? 'Access your online assessments and track your exam history.' : 'Accédez à vos évaluations en ligne et suivez votre historique d\'examens.')
                : (language === 'en' ? `Coordinating schedules and onsite evaluations.` : `Coordination des horaires et des évaluations sur site.`)}
            </p>
          </div>
        </div>

        {canScheduleExams && (
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Dialog open={isDrawingTimetable} onOpenChange={setIsDrawingTimetable}>
                <DialogTrigger asChild>
                  <Button className="flex-1 md:flex-none gap-2 shadow-lg h-12 px-6 rounded-2xl bg-secondary text-primary hover:bg-secondary/90 font-bold">
                    <LayoutGrid className="w-5 h-5" /> {language === 'en' ? 'Draw Timetable' : 'Gérer l\'Emploi du Temps'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                  <DialogHeader className="bg-primary p-8 text-white relative">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-2xl">
                        <CalendarDays className="w-8 h-8 text-secondary" />
                      </div>
                      <div>
                        <DialogTitle className="text-2xl font-black">Master Schedule Slot</DialogTitle>
                        <DialogDescription className="text-white/60">Assigning slots across institutional sections.</DialogDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsDrawingTimetable(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                      <X className="w-6 h-6" />
                    </Button>
                  </DialogHeader>
                  <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Class</Label>
                        <Select onValueChange={(v) => setTimetableFormData({...timetableFormData, class: v})}>
                          <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                          <SelectContent>{availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                        <Select onValueChange={(v) => setTimetableFormData({...timetableFormData, subject: v})}>
                          <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                          <SelectContent>{(subjectsData?.results || SUBJECT_METADATA).map((s: any) => <SelectItem key={s.name || s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Day of Week</Label>
                        <Select onValueChange={(v) => setTimetableFormData({...timetableFormData, day: v})}>
                          <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl"><SelectValue placeholder="Select Day" /></SelectTrigger>
                          <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time Slot</Label>
                        <Select onValueChange={(v) => setTimetableFormData({...timetableFormData, time: v})}>
                          <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl"><SelectValue placeholder="Select Time" /></SelectTrigger>
                          <SelectContent>{TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Venue</Label>
                        <Select onValueChange={(v) => setTimetableFormData({...timetableFormData, room: v})}>
                          <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl"><SelectValue placeholder="Select Room" /></SelectTrigger>
                          <SelectContent>
                            {ROOM_CATEGORIES.map(cat => (
                              <SelectGroup key={cat.label}>
                                <SelectLabel className="text-[10px] uppercase font-black opacity-40 px-2 py-1.5">{cat.label}</SelectLabel>
                                {cat.rooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
                    <Button onClick={() => setIsDrawingTimetable(false)} className="w-full h-12 font-bold shadow-lg">Confirm & Sync Schedules</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isSchedulingOnsite} onOpenChange={setIsSchedulingOnsite}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 md:flex-none gap-2 shadow-sm h-12 px-6 rounded-2xl border-primary/20 bg-white">
                  <CalendarDays className="w-5 h-5 text-primary" /> {language === 'en' ? 'Schedule Onsite Exam' : 'Planifier Exam sur Site'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="bg-primary p-8 text-white relative">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <PenTool className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black">Schedule Physical Exam</DialogTitle>
                      <DialogDescription className="text-white/60">
                        {isTeacher ? "Plan an evaluation for your assigned subjects." : "Coordinates physical seating and invigilation duties."}
                      </DialogDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsSchedulingOnsite(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                    <X className="w-6 h-6" />
                  </Button>
                </DialogHeader>
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Exam Title</Label>
                      <Input placeholder="e.g. End of Term Paper" className="h-12 bg-accent/30 border-none rounded-xl font-bold" onChange={(e) => setOnsiteFormData({...onsiteFormData, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Exam Type</Label>
                      <Select onValueChange={(v) => setOnsiteFormData({...onsiteFormData, type: v})} value={onsiteFormData.type}>
                        <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Subject</Label>
                      <Select onValueChange={(v) => setOnsiteFormData({...onsiteFormData, subject: v})}>
                        <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-bold"><SelectValue placeholder="Choose Subject" /></SelectTrigger>
                        <SelectContent>{filteredSubjects.map((s: any) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Class</Label>
                      <Select onValueChange={(v) => setOnsiteFormData({...onsiteFormData, class: v})}>
                        <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-bold"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                        <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Venue</Label>
                      <Input 
                        placeholder="e.g. Hall A or Lab 1" 
                        className="h-12 bg-accent/30 border-none rounded-xl font-bold" 
                        value={onsiteFormData.room}
                        onChange={(e) => setOnsiteFormData({...onsiteFormData, room: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Exam Date</Label>
                      <Input type="date" className="h-12 bg-accent/30 border-none rounded-xl" onChange={(e) => setOnsiteFormData({...onsiteFormData, date: e.target.value})} />
                    </div>
                  </div>
                </div>
                <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
                  <Button onClick={handleScheduleOnsite} disabled={!onsiteFormData.title || !onsiteFormData.subject} className="w-full h-12 font-bold shadow-lg">Confirm Exam Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Tabs defaultValue="onsite" className="w-full">
        <TabsList className={cn(
          "grid w-full mb-8 bg-white shadow-sm border h-auto p-1 rounded-2xl overflow-x-auto no-scrollbar",
          isStudent ? "grid-cols-3 lg:w-[600px]" : "grid-cols-3 lg:w-[600px]"
        )}>
          <TabsTrigger value="onsite" className="gap-2 py-3 rounded-xl transition-all text-xs lg:text-sm whitespace-nowrap">
            <CalendarDays className="w-4 h-4" /> {language === 'en' ? 'Onsite Exams' : 'Exams sur Site'}
          </TabsTrigger>
          {isStudent && (
            <TabsTrigger value="available" className="gap-2 py-3 rounded-xl transition-all text-xs lg:text-sm whitespace-nowrap">
              <PenTool className="w-4 h-4" /> {language === 'en' ? 'Live MCQs' : 'QCM Live'}
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2 py-3 rounded-xl transition-all text-xs lg:text-sm whitespace-nowrap">
            <History className="w-4 h-4" /> {language === 'en' ? 'History' : 'Historique'}
          </TabsTrigger>
          {!isStudent && !isTeacher && (
            <TabsTrigger value="timetable" className="gap-2 py-3 rounded-xl transition-all text-xs lg:text-sm whitespace-nowrap">
              <LayoutGrid className="w-4 h-4" /> {language === 'en' ? 'Master Timetable' : 'Emplois du Temps'}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="onsite" className="mt-0 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOnsiteExams.map((exam) => (
              <Card key={exam.id} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all bg-white">
                <div className="bg-accent/30 p-4 border-b flex justify-between items-center">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">{exam.class}</Badge>
                  <Badge className="bg-primary text-white border-none font-bold text-[9px] px-3">{exam.status}</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-black text-primary leading-tight">{exam.title}</CardTitle>
                  <CardDescription className="font-bold flex items-center gap-2 mt-1">
                    <BookOpen className="w-3.5 h-3.5 text-secondary" /> {exam.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3 text-primary/40" /> Venue</p>
                      <p className="text-xs font-black text-primary">{exam.room}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1"><Clock className="w-3 h-3 text-primary/40" /> Schedule</p>
                      <p className="text-xs font-black text-primary">{exam.date} • {exam.time}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 p-4 border-t bg-accent/5">
                   <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                     <User className="w-3 h-3" /> Invigilator: {exam.teacher}
                   </p>
                </CardFooter>
              </Card>
            ))}
            {filteredOnsiteExams.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-white/50 space-y-4">
                <CalendarDays className="w-12 h-12 text-primary/10 mx-auto" />
                <p className="text-muted-foreground font-medium">No physical exams scheduled in your purview.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="available" className="mt-0 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeExams.map((exam) => {
              const isLive = new Date(exam.startTime) <= currentTime;
              return (
                <Card key={exam.id} className="border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300 rounded-3xl bg-white">
                  <div className={cn("h-1.5 w-full", isLive ? "bg-red-600" : "bg-secondary")} />
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] font-black uppercase tracking-widest">
                        {exam.subject}
                      </Badge>
                      {isLive && (
                        <Badge className="bg-red-600 text-white border-none text-[9px] font-black animate-pulse">LIVE</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-black text-primary">{exam.title}</CardTitle>
                    <CardDescription className="font-medium flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-secondary" /> {exam.teacher}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-accent/30 border border-accent space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Duration</p>
                        <p className="text-sm font-black flex items-center gap-2"><Timer className="w-3.5 h-3.5 text-primary" /> {exam.duration}m</p>
                      </div>
                      <div className="p-3 rounded-xl bg-accent/30 border border-accent space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Start Time</p>
                        <p className="text-sm font-black truncate">{new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 p-6">
                    {isLive ? (
                      <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg bg-primary text-white">
                        <Link href={`/dashboard/exams/take?id=${exam.id}`}>
                          {language === 'en' ? 'Enter Examination' : 'Démarrer l\'Examen'}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs gap-2"
                        onClick={() => setViewingInstructions(exam)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" />
                            {language === 'en' ? 'View Instructions' : 'Voir Instructions'}
                          </div>
                        </div>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
                <History className="w-4 h-4" /> Assessment History
              </CardTitle>
              <CardDescription>Verified results from past evaluations.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-accent/10">
                  <TableRow className="uppercase text-[10px] font-black tracking-widest">
                    <TableHead className="pl-8 py-4">Assessment Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-right pr-8">Integrity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_EXAM_HISTORY.map((hist, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8 py-4 font-bold text-sm text-primary">{hist.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{hist.subject}</Badge></TableCell>
                      <TableCell className="text-center font-black text-primary">
                        {hist.status === 'ABSENT' ? '---' : `${hist.score} / ${hist.total}`}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{hist.date}</TableCell>
                      <TableCell className="text-right pr-8">
                        <Badge className={cn(
                          "text-[9px] font-black uppercase border-none px-3",
                          getStatusStyles(hist.status)
                        )}>
                          {getStatusIcon(hist.status)}
                          {hist.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {!isStudent && !isTeacher && (
          <TabsContent value="timetable" className="mt-0">
            <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
              <CardHeader className="border-b bg-white flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                <div>
                  <CardTitle className="text-lg font-black text-primary uppercase tracking-tight">Institutional Master Timetable</CardTitle>
                  <CardDescription>
                    {isSchoolAdmin ? "Visualizing all sections and duty coverage." : "Focused view for your assigned section."}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="w-full md:w-auto gap-2 rounded-xl h-10 font-bold"><Printer className="w-4 h-4" /> Print Master Plan</Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-accent/10 uppercase text-[10px] font-black tracking-widest border-b">
                    <TableRow>
                      <TableHead className="pl-6 h-12">Class Level</TableHead>
                      {DAYS.map(day => <TableHead key={day}>{day}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableClasses.map(cls => (
                      <TableRow key={cls} className="border-b last:border-0 hover:bg-accent/5">
                        <TableCell className="pl-6 font-bold text-primary text-xs whitespace-nowrap">{cls}</TableCell>
                        {DAYS.map(day => (
                          <TableCell key={day} className="py-4">
                            <div className="bg-white p-2 rounded-xl border shadow-sm min-h-[65px] flex flex-col justify-center">
                              <p className="text-[10px] font-black text-primary leading-tight">Advanced Physics</p>
                              <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
                                <MapPin className="w-2.5 h-2.5" />
                                <span className="text-[8px] font-bold uppercase">Room 402</span>
                              </div>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* INSTRUCTIONS DIALOG */}
      <Dialog open={!!viewingInstructions} onOpenChange={() => setViewingInstructions(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-8 text-white relative">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Info className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">Exam Instructions</DialogTitle>
                <DialogDescription className="text-white/60">{viewingInstructions?.title}</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setViewingInstructions(null)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase text-primary/60">Schedule</p>
                  <p className="text-sm font-bold text-primary">
                    Starts: {viewingInstructions && new Date(viewingInstructions.startTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-primary/60">Pedagogical Guidelines</p>
                <p className="text-sm leading-relaxed text-muted-foreground italic font-medium">
                  "{viewingInstructions?.instructions}"
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
            <Button onClick={() => setViewingInstructions(null)} className="w-full h-12 rounded-xl shadow-lg font-bold">I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
