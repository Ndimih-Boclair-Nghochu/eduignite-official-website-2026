
"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useStudents } from "@/lib/hooks/useStudents";
import { useAnnualResults, useGrades } from "@/lib/hooks/useGrades";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileBadge, 
  Search, 
  Download, 
  Printer, 
  ArrowLeft, 
  Building2, 
  ShieldCheck, 
  QrCode, 
  Network, 
  Filter,
  Users,
  Loader2,
  X,
  Eye,
  GraduationCap,
  Info
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const CLASSES = ["6ème / Form 1", "5ème / Form 2", "4ème / Form 3", "3ème / Form 4", "2nde / Form 5", "1ère / Lower Sixth", "Terminale / Upper Sixth"];
const SECTIONS = ["Anglophone Section", "Francophone Section", "Technical Section"];

const MOCK_STUDENTS = [
  { id: "GBHS26S001", name: "Alice Thompson", class: "2nde / Form 5", section: "Anglophone Section", avatar: "https://picsum.photos/seed/s1/100/100", dob: "15/05/2008" },
  { id: "GBHS26S002", name: "Bob Richards", class: "Terminale / Upper Sixth", section: "Anglophone Section", avatar: "https://picsum.photos/seed/s2/100/100", dob: "22/11/2006" },
  { id: "GBHS26S003", name: "Charlie Davis", class: "1ère / Lower Sixth", section: "Francophone Section", avatar: "https://picsum.photos/seed/s3/100/100", dob: "10/03/2007" },
  { id: "GBHS26S004", name: "Diana Prince", class: "2nde / Form 5", section: "Technical Section", avatar: "https://picsum.photos/seed/s4/100/100", dob: "05/01/2008" },
];

const MOCK_TRANSCRIPT_DATA = {
  "Advanced Physics": { f1: ["12.5", "13.0", "14.2"], f2: ["11.0", "12.5", "13.5"], f3: ["14.0", "15.5", "16.0"] },
  "Mathematics": { f1: ["15.0", "16.5", "17.0"], f2: ["14.5", "15.0", "16.0"], f3: ["17.5", "18.0", "17.5"] },
  "English": { f1: ["10.0", "11.5", "12.0"], f2: ["09.5", "10.0", "11.0"], f3: ["12.5", "13.0", "13.5"] },
  "History": { f1: ["08.5", "09.0", "10.5"], f2: ["07.5", "08.0", "09.5"], f3: ["09.0", "10.5", "11.0"] }
};

export default function TranscriptsPage() {
  const { user, platformSettings } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<any>(null);

  // Fetch real data from backend
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ search: searchTerm || undefined });
  const { data: annualResultsData } = useAnnualResults();

  // Map API students to the shape used by this page
  const apiStudents = useMemo(() => {
    if (!studentsData?.results) return null;
    return studentsData.results.map((s: any) => ({
      id: s.admission_number || s.user?.matricule || s.id,
      name: s.user?.name || 'Unknown',
      class: s.student_class || 'Unknown',
      section: s.section || 'Unknown',
      avatar: s.user?.avatar,
      dob: s.date_of_birth || '',
    }));
  }, [studentsData]);

  const studentList = apiStudents || MOCK_STUDENTS;

  const filteredStudents = useMemo(() => studentList.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === "all" || s.class === classFilter;
    const matchesSection = sectionFilter === "all" || s.section === sectionFilter;
    return matchesSearch && matchesClass && matchesSection;
  }), [studentList, searchTerm, classFilter, sectionFilter]);

  const handleBulkIssue = () => {
    if (filteredStudents.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast({ title: "Batch Generation Successful" });
    }, 2000);
  };

  const handleIndividualIssue = (student: any) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast({ title: "Transcript Prepared", description: `Record for ${student.name} ready.` });
    }, 1200);
  };

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
                <FileBadge className="w-6 h-6 text-secondary" />
              </div>
              {language === 'en' ? 'Transcripts Registry' : 'Gestion des Relevés'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Issue official landscape transcripts for students.</p>
          </div>
        </div>
        
        <Button 
          className="gap-2 shadow-lg h-12 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] w-full md:w-auto" 
          onClick={handleBulkIssue}
          disabled={isProcessing || filteredStudents.length === 0}
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Issue Batch ({filteredStudents.length})
        </Button>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white">
        <CardHeader className="bg-white border-b p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search name or matricule..." 
                className="pl-10 h-12 bg-accent/20 border-none rounded-xl text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 col-span-1 md:col-span-2">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="flex-1 h-12 bg-accent/20 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="All Sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole Node</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="flex-1 h-12 bg-accent/20 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire School</SelectItem>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-accent/10">
              <TableRow className="uppercase text-[9px] font-black tracking-widest border-b border-accent/20">
                <TableHead className="pl-8 py-4">Matricule</TableHead>
                <TableHead>Student Profile</TableHead>
                <TableHead className="hidden md:table-cell">Class</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((s) => (
                <TableRow key={s.id} className="hover:bg-accent/5 transition-colors border-b border-accent/10 h-16">
                  <TableCell className="pl-8 font-mono text-[10px] font-bold text-primary">{s.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border shrink-0"><AvatarImage src={s.avatar} /><AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">{s.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs md:text-sm text-primary uppercase leading-none">{s.name}</span>
                        <span className="text-[8px] font-black uppercase text-muted-foreground md:hidden">{s.class}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-[9px] border-primary/10 text-primary font-bold">{s.class}</Badge>
                  </TableCell>
                  <TableCell className="text-center"><Badge className="bg-green-100 text-green-700 border-none text-[8px] font-black">VERIFIED</Badge></TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5" onClick={() => setPreviewStudent(s)}><Eye className="w-4 h-4 text-primary/60" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5" onClick={() => handleIndividualIssue(s)}><Download className="w-4 h-4 text-primary/60" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!previewStudent} onOpenChange={() => setPreviewStudent(null)}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
          <DialogHeader className="bg-primary p-6 md:p-8 text-white relative shrink-0 no-print">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl text-secondary"><FileBadge className="w-8 h-8" /></div>
                <div>
                  <DialogTitle className="text-xl md:text-2xl font-black uppercase">Transcript Preview</DialogTitle>
                  <DialogDescription className="text-white/60 text-xs">Official academic record for {previewStudent?.name}.</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewStudent(null)} className="text-white hover:bg-white/10"><X className="w-6 h-6" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-muted p-2 md:p-10 print:p-0 print:bg-white no-scrollbar">
            <div className="overflow-x-auto rounded-xl border-2 border-primary/10 shadow-inner bg-white">
              <LandscapeTranscript student={previewStudent} platform={platformSettings} />
            </div>
          </div>
          <DialogFooter className="bg-accent/10 p-6 border-t border-accent flex justify-between items-center shrink-0 no-print">
             <div className="hidden sm:flex items-center gap-2 text-muted-foreground italic">
                <Info className="w-4 h-4 text-primary opacity-40" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Records up to current session are included.</p>
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none rounded-xl h-11 px-6 font-bold text-xs" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                <Button onClick={() => handleIndividualIssue(previewStudent)} className="flex-1 sm:flex-none rounded-xl px-10 h-11 font-black uppercase text-[9px] bg-primary text-white">Issue Official Copy</Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LandscapeTranscript({ student, platform }: { student: any, platform: any }) {
  const currentGrade = student?.class || "2nde / Form 5";
  const classIndex = CLASSES.indexOf(currentGrade);
  const visibleClasses = CLASSES.slice(0, classIndex + 1);

  return (
    <div className="bg-white p-8 md:p-12 relative overflow-hidden font-serif text-black min-w-[1100px] print:p-0">
      <div className="grid grid-cols-3 gap-4 items-start text-center border-b-2 border-black pb-6">
        <div className="space-y-1 text-[9px] uppercase font-black text-left">
          <p>Republic of Cameroon</p>
          <p>Peace - Work - Fatherland</p>
          <div className="h-px bg-black w-8 my-1" />
          <p>Ministry of Secondary Education</p>
          <p>{platform.name} ACADEMIC NODE</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 bg-white flex items-center justify-center p-2 border-2 border-primary/10">
             <img src={platform.logo} alt="Logo" className="w-14 h-14 object-contain" />
          </div>
          <p className="text-[9px] font-black uppercase text-primary tracking-tighter">Verified Node Record</p>
        </div>
        <div className="space-y-1 text-[9px] uppercase font-black text-right">
          <p>République du Cameroun</p>
          <p>Paix - Travail - Patrie</p>
          <div className="h-px bg-black w-8 ml-auto my-1" />
          <p>Min. des Enseignements Secondaires</p>
        </div>
      </div>

      <div className="text-center my-10 space-y-2">
        <h1 className="text-4xl font-black uppercase tracking-widest underline underline-offset-8 decoration-double">OFFICIAL TRANSCRIPT</h1>
        <p className="text-sm font-bold opacity-60 italic">Academic Record 2023 / 2024</p>
      </div>

      <div className="grid grid-cols-12 gap-8 bg-accent/5 p-6 border border-black/10 rounded-2xl items-center mb-10 shadow-inner">
        <div className="col-span-3">
           <Avatar className="w-28 h-28 border-4 border-white rounded-[2rem] shadow-xl mx-auto">
              <AvatarImage src={student?.avatar} />
              <AvatarFallback className="text-3xl font-black">{student?.name?.charAt(0)}</AvatarFallback>
           </Avatar>
        </div>
        <div className="col-span-9 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          <div className="flex justify-between border-b border-black/5 pb-1"><span className="font-bold uppercase opacity-60 text-[9px]">Identity:</span><span className="font-black uppercase">{student?.name}</span></div>
          <div className="flex justify-between border-b border-black/5 pb-1"><span className="font-bold uppercase opacity-60 text-[9px]">Matricule:</span><span className="font-mono font-bold text-primary">{student?.id}</span></div>
          <div className="flex justify-between border-b border-black/5 pb-1"><span className="font-bold uppercase opacity-60 text-[9px]">Class:</span><span className="font-bold">{student?.class}</span></div>
          <div className="flex justify-between border-b border-black/5 pb-1"><span className="font-bold uppercase opacity-60 text-[9px]">Status:</span><span className="font-bold text-green-600">ENROLLED</span></div>
        </div>
      </div>

      <div className="border-2 border-black overflow-hidden rounded-sm mb-10">
        <Table className="border-collapse">
          <TableHeader className="bg-black/5">
            <TableRow className="border-b-2 border-black h-12">
              <TableHead rowSpan={2} className="border-r-2 border-black font-black text-black uppercase text-[10px] text-center w-48">Subject</TableHead>
              {visibleClasses.map((cls, i) => (
                <TableHead key={i} colSpan={3} className={cn("border-r-2 border-black font-black text-black uppercase text-[10px] text-center h-8", i === visibleClasses.length - 1 ? "border-r-0" : "")}>
                  {cls.split(' / ')[1] || cls}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="border-b-2 border-black h-8">
              {visibleClasses.map((_, i) => (
                <React.Fragment key={i}>
                  <TableHead className="border-r border-black font-bold text-[8px] text-center">T1</TableHead>
                  <TableHead className="border-r border-black font-bold text-[8px] text-center">T2</TableHead>
                  <TableHead className={cn("border-r-2 border-black font-bold text-[8px] text-center", i === visibleClasses.length - 1 ? "border-r-0" : "")}>T3</TableHead>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(MOCK_TRANSCRIPT_DATA).map(([subject, years]: [string, any], idx) => (
              <TableRow key={idx} className="border-b border-black last:border-0 h-10">
                <TableCell className="border-r-2 border-black font-black text-[10px] uppercase py-2 pl-4">{subject}</TableCell>
                {visibleClasses.map((_, i) => {
                  const data = years[`f${i + 1}`] || ["---", "---", "---"];
                  return (
                    <React.Fragment key={i}>
                      <TableCell className={cn("border-r border-black text-center text-[10px] font-mono", parseFloat(data[0]) < 10 ? "text-red-600" : "")}>{data[0]}</TableCell>
                      <TableCell className={cn("border-r border-black text-center text-[10px] font-mono", parseFloat(data[1]) < 10 ? "text-red-600" : "")}>{data[1]}</TableCell>
                      <TableCell className={cn("border-r-2 border-black text-center text-[10px] font-mono bg-accent/5", i === visibleClasses.length - 1 ? "border-r-0" : "", parseFloat(data[2]) < 10 ? "text-red-600" : "")}>{data[2]}</TableCell>
                    </React.Fragment>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-3 gap-10 mt-16 pt-10 border-t-2 border-black/5">
        <div className="flex flex-col items-center gap-4 text-center">
          <QrCode className="w-20 h-20 opacity-10" />
          <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40">Security Scan</p>
        </div>
        <div className="text-center space-y-6 w-48 mx-auto">
          <div className="h-14 w-full bg-accent/10 border-b-2 border-black/40 relative flex items-center justify-center overflow-hidden">
             <SignatureSVG className="w-full h-full text-primary/10 p-2" />
          </div>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">The Registrar</p>
        </div>
        <div className="text-center space-y-6">
          <div className="h-14 w-full bg-accent/10 border-b-2 border-black/40 flex items-center justify-center">
             <Badge variant="outline" className="border-black text-[8px] font-black uppercase px-4 py-1">OFFICIAL SEAL</Badge>
          </div>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Institutional Head</p>
        </div>
      </div>
    </div>
  );
}

function SignatureSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 25C15 25 20 15 25 15C30 15 35 30 40 30C45 30 50 10 55 10C60 10 65 35 70 35C75 35 80 20 85 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
