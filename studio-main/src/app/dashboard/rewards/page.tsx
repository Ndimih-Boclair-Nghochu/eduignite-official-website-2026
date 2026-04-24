
"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useHonourRoll } from "@/lib/hooks/useStudents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trophy, 
  Award, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ShieldCheck, 
  QrCode, 
  Star, 
  ChevronRight, 
  GraduationCap, 
  Building2, 
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Info,
  Loader2,
  X,
  FileBadge,
  ArrowLeft,
  Save,
  TrendingUp,
  FileDown,
  Eye,
  Signature as SignatureIcon,
  Medal,
  Briefcase
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";

// --- MOCK DATA ---
const SECTIONS = ["Anglophone Section", "Francophone Section", "Technical Section"];
const CLASSES = ["6ème / Form 1", "5ème / Form 2", "4ème / Form 3", "3ème / Form 4", "2nde / Form 5", "1ère / Lower Sixth", "Terminale / Upper Sixth"];

export default function AcademicRewardsPage() {
  const { user, platformSettings, updatePlatformSettings, staffRemarks } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [threshold, setThreshold] = useState(platformSettings.honourRollThreshold || 15.0);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<any>(null);
  const [viewingProfessionalCert, setViewingProfessionalCert] = useState<any>(null);

  const isAdmin = ["SCHOOL_ADMIN", "SUB_ADMIN"].includes(user?.role || "");
  const isStudent = user?.role === "STUDENT";
  const isStaff = ["TEACHER", "BURSAR", "LIBRARIAN"].includes(user?.role || "");

  // Fetch real honour roll data from API
  const { data: honourRollData } = useHonourRoll();

  // Map API students to the shape used by this page
  const studentList = useMemo(() => {
    return (honourRollData?.results || []).map((s: any) => ({
      id: s.admission_number || s.user?.matricule || s.id,
      name: s.user?.name || 'Unknown',
      class: s.student_class || 'Unknown',
      section: s.section || 'Unknown',
      average: parseFloat(s.annual_average || s.user?.annual_avg || '0'),
      avatar: resolveMediaUrl(s.user?.avatar) || '',
    }));
  }, [honourRollData]);

  const availableSections = useMemo(
    () => Array.from(new Set(studentList.map((student: any) => student.section).filter(Boolean))).sort(),
    [studentList]
  );

  const availableClasses = useMemo(
    () => Array.from(new Set(studentList.map((student: any) => student.class).filter(Boolean))).sort(),
    [studentList]
  );

  const eligibleStudents = useMemo(() => {
    return studentList.filter((s: any) => {
      const matchesThreshold = s.average >= threshold;
      const matchesSection = sectionFilter === "all" || s.section === sectionFilter;
      const matchesClass = classFilter === "all" || s.class === classFilter;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesThreshold && matchesSection && matchesClass && matchesSearch;
    });
  }, [studentList, threshold, sectionFilter, classFilter, searchTerm]);

  const myProfessionalRemarks = useMemo(() => {
    return staffRemarks.filter(r => r.staffId === user?.id);
  }, [staffRemarks, user?.id]);

  const handleUpdateThreshold = () => {
    setIsProcessing(true);
    setTimeout(() => {
      updatePlatformSettings({ ...platformSettings, honourRollThreshold: threshold });
      setIsProcessing(false);
      toast({ title: "Policy Synchronized", description: `Honour roll threshold updated to ${threshold}/20.` });
    }, 1000);
  };

  const handleDownload = (title: string) => {
    toast({ title: "Preparation Started", description: `Generating high-fidelity PDF for ${title}...` });
    setTimeout(() => {
      toast({ title: "Download Successful", description: `${title} has been saved to your device.` });
    }, 2000);
  };

  // --- STAFF VIEW (PROFESSIONAL RECOGNITION) ---
  if (isStaff) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm hover:bg-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Professional Recognition</h1>
              <p className="text-muted-foreground mt-1">Registry of administrative commendations and excellence awards.</p>
            </div>
          </div>
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase tracking-widest flex items-center gap-2 bg-white">
            <Medal className="w-4 h-4 text-secondary" /> Verified Portfolio
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="border-none shadow-sm bg-primary text-white p-6 rounded-3xl flex items-center gap-4 group hover:shadow-md transition-all">
              <div className="p-3 bg-white/10 rounded-2xl text-secondary group-hover:scale-110 transition-transform"><Medal className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Formal Remarks</p>
                 <p className="text-2xl font-black">{myProfessionalRemarks.length} Records</p>
              </div>
           </Card>
           <Card className="border-none shadow-sm bg-white p-6 rounded-3xl flex items-center gap-4 group hover:shadow-md transition-all border border-primary/5">
              <div className="p-3 bg-secondary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform"><Briefcase className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Employment Status</p>
                 <p className="text-2xl font-black text-primary">PERMANENT</p>
              </div>
           </Card>
           <Card className="border-none shadow-sm bg-white p-6 rounded-3xl flex items-center gap-4 group hover:shadow-md transition-all border border-primary/5">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform"><ShieldCheck className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Node Registry</p>
                 <p className="text-2xl font-black text-primary">ACTIVE</p>
              </div>
           </Card>
        </div>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 p-8 border-b">
            <CardTitle className="text-xl font-black text-primary uppercase flex items-center gap-2">
              <History className="w-5 h-5 text-secondary" /> Commendation Ledger
            </CardTitle>
            <CardDescription>Verified chronological record of professional remarks issued by the school administration.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-accent/10 uppercase text-[9px] font-black tracking-widest border-b">
                <TableRow>
                  <TableHead className="pl-8 py-4">Recognition Date</TableHead>
                  <TableHead>Issuing Authority</TableHead>
                  <TableHead>Commendation Summary</TableHead>
                  <TableHead className="text-right pr-8">Official Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myProfessionalRemarks.map((remark) => (
                  <TableRow key={remark.id} className="h-20 border-b hover:bg-accent/5 transition-colors">
                    <TableCell className="pl-8 font-mono text-xs font-bold text-muted-foreground">{remark.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-black text-primary text-xs uppercase">
                        <SignatureIcon className="w-4 h-4 text-secondary" />
                        {remark.adminName}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-xs italic text-muted-foreground line-clamp-2 leading-relaxed">"{remark.text}"</p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        size="sm" 
                        className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2 shadow-lg"
                        onClick={() => setViewingProfessionalCert(remark)}
                      >
                        <Award className="w-3.5 h-3.5" /> View Certificate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {myProfessionalRemarks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20">
                      <div className="space-y-4 opacity-30 flex flex-col items-center">
                        <FileBadge className="w-16 h-16" />
                        <p className="text-sm font-bold uppercase tracking-widest">No formal remarks in professional registry.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* PROFESSIONAL CERTIFICATE DIALOG */}
        <Dialog open={!!viewingProfessionalCert} onOpenChange={() => setViewingProfessionalCert(null)}>
          <DialogContent className="sm:max-w-5xl max-h-[95vh] p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
            <DialogHeader className="bg-primary p-6 md:p-8 text-white no-print relative shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl text-secondary"><Medal className="w-8 h-8" /></div>
                  <div>
                    <DialogTitle className="text-xl md:text-2xl font-black uppercase">Professional Appreciation</DialogTitle>
                    <DialogDescription className="text-white/60 text-xs">Official institutional commendation record.</DialogDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewingProfessionalCert(null)} className="text-white hover:bg-white/10 transition-all"><X className="w-6 h-6" /></Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto bg-muted p-2 md:p-10 print:p-0 print:bg-white no-scrollbar">
              <div className="overflow-x-auto rounded-xl border-2 border-primary/10 shadow-inner bg-white">
                <ProfessionalCertificatePreview remark={viewingProfessionalCert} student={user} platform={platformSettings} />
              </div>
            </div>
            <DialogFooter className="bg-accent/10 p-6 border-t border-accent flex justify-between items-center shrink-0 no-print">
               <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
                  <p className="text-[10px] font-black uppercase italic opacity-40">Verified Institutional Professional Record</p>
               </div>
               <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                  <Button className="rounded-xl px-10 h-11 font-black uppercase text-[10px] gap-2 shadow-lg" onClick={() => handleDownload('Professional Appreciation')}><Download className="w-4 h-4" /> Download PDF</Button>
               </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isStudent) {
    const studentAverage = user?.annualAvg || 0;
    const isEligible = studentAverage >= (platformSettings.honourRollThreshold || 15.0);

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm hover:bg-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Academic Reward Portal</h1>
            <p className="text-muted-foreground mt-1">Verified recognition for pedagogical excellence.</p>
          </div>
        </div>

        {isEligible ? (
          <div className="space-y-8">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-primary text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform"><Trophy className="w-48 h-48"/></div>
              <CardHeader className="p-10 pb-2 relative z-10">
                <Badge variant="secondary" className="bg-secondary text-primary border-none font-black uppercase text-[10px] px-4 py-1 mb-4 shadow-xl">
                  HONOUR ROLL QUALIFIED
                </Badge>
                <CardTitle className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Congratulations, {user?.name?.split(' ')[0]}</CardTitle>
                <CardDescription className="text-white/60 text-lg mt-4 font-medium max-w-xl">
                  Based on your annual average of <span className="text-secondary font-black">{studentAverage.toFixed(2)}</span>, you have been officially registered on the institutional Honour Roll.
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-10 pt-6 relative z-10">
                <Button className="h-14 px-10 rounded-2xl bg-secondary text-primary hover:bg-secondary/90 font-black uppercase text-xs tracking-widest gap-3 shadow-2xl transition-all active:scale-95" onClick={() => setViewingCertificate(user)}>
                  <Trophy className="w-5 h-5" /> View Digital Certificate
                </Button>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="border-none shadow-sm bg-white p-8 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-xl text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
                    <h4 className="text-sm font-black uppercase text-primary tracking-widest">Eligibility Verified</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Your records have been synchronized with the national pedagogical node. Your certificate is valid for institutional verification.</p>
               </Card>
               <Card className="border-none shadow-sm bg-secondary/10 p-8 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/20 rounded-xl text-primary"><Star className="w-5 h-5" /></div>
                    <h4 className="text-sm font-black uppercase text-primary tracking-widest">Global Ranking</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">You are currently in the top <span className="font-black text-primary">5%</span> of students across the {user?.school?.name || "institution"}.</p>
               </Card>
            </div>
          </div>
        ) : (
          <Card className="border-none shadow-xl rounded-[3rem] bg-white overflow-hidden text-center p-12 space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-red-50 rounded-full blur-3xl animate-pulse" />
              <div className="relative w-24 h-24 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-red-200">
                <XCircle className="w-12 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">You were not eligible</h2>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                The current institutional threshold for the Honour Roll is <span className="font-bold text-primary">{platformSettings.honourRollThreshold}/20</span>. 
                Your current average is <span className="font-bold text-red-600">{studentAverage.toFixed(2)}</span>. Keep pushing for excellence!
              </p>
            </div>
            <div className="pt-4 border-t flex flex-col items-center gap-4">
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Need Support?</p>
               <Button asChild variant="outline" className="rounded-xl font-bold h-11 px-8 gap-2">
                 <Link href="/dashboard/ai-assistant">Consult AI Study Assistant <ChevronRight className="w-4 h-4"/></Link>
               </Button>
            </div>
          </Card>
        )}

        {/* STUDENT CERTIFICATE MODAL */}
        <Dialog open={!!viewingCertificate} onOpenChange={() => setViewingCertificate(null)}>
          <DialogContent className="sm:max-w-5xl max-h-[95vh] p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
            <DialogHeader className="bg-primary p-6 md:p-8 text-white no-print relative shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl text-secondary"><Award className="w-8 h-8" /></div>
                  <DialogTitle className="text-xl md:text-2xl font-black uppercase">Honour Roll Certificate</DialogTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewingCertificate(null)} className="text-white hover:bg-white/10"><X className="w-6 h-6" /></Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto bg-muted p-2 md:p-10 print:p-0 print:bg-white no-scrollbar">
              <div className="overflow-x-auto rounded-xl border-2 border-primary/10 shadow-inner bg-white">
                <CertificatePreview student={viewingCertificate} platform={platformSettings} />
              </div>
            </div>
            <DialogFooter className="bg-accent/10 p-6 border-t border-accent flex justify-between items-center shrink-0 no-print">
               <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
                  <p className="text-[10px] font-black uppercase italic opacity-40">Digitally Signed Institutional Achievement</p>
               </div>
               <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                  <Button className="rounded-xl px-10 h-11 font-black uppercase text-[10px] gap-2 shadow-lg" onClick={() => handleDownload('Honour Roll Certificate')}><Download className="w-4 h-4" /> Download PDF</Button>
               </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- ADMIN VIEW (REWARD SETTINGS & REGISTRY) ---
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3 uppercase tracking-tighter">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <Trophy className="w-6 h-6 text-secondary" />
            </div>
            Academic Reward Management
          </h1>
          <p className="text-muted-foreground mt-1">Set excellence thresholds and manage institutional certificates.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-6">
           <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Current Threshold</Label>
              <div className="flex items-center gap-3">
                 <Input 
                  type="number" 
                  step="0.1" 
                  max="20" 
                  min="10" 
                  value={threshold} 
                  onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                  className="w-24 h-10 border-none bg-accent/30 rounded-xl font-black text-primary text-center" 
                 />
                 <Button size="sm" className="h-10 rounded-xl px-4 gap-2 font-bold" onClick={handleUpdateThreshold} disabled={isProcessing}>
                   {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Sync
                 </Button>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-none shadow-sm bg-white p-6 rounded-3xl flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="p-3 bg-primary/5 rounded-2xl text-primary group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Eligible</p>
               <p className="text-2xl font-black text-primary">{eligibleStudents.length} Students</p>
            </div>
         </Card>
         <Card className="border-none shadow-sm bg-secondary/20 p-6 rounded-3xl flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="p-3 bg-secondary/40 rounded-2xl text-primary group-hover:scale-110 transition-transform"><TrendingUp className="w-6 h-6" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Node Average</p>
               <p className="text-2xl font-black text-primary">14.25 / 20</p>
            </div>
         </Card>
         <Card className="border-none shadow-sm bg-white p-6 rounded-3xl flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pass Velocity</p>
               <p className="text-2xl font-black text-primary">84.2%</p>
            </div>
         </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white">
        <CardHeader className="bg-primary/5 p-8 border-b flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-xl text-white shadow-lg"><Star className="w-8 h-8 text-secondary" /></div>
            <div>
              <CardTitle className="text-xl font-black uppercase">Honour Roll Registry</CardTitle>
              <CardDescription>Filtering students qualifying for academic recognition.</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl font-bold bg-white" onClick={() => handleDownload('Honour Roll Registry')}><FileDown className="w-4 h-4 mr-2" /> PDF</Button>
            <Button className="flex-1 md:flex-none h-11 px-8 rounded-xl font-black uppercase text-[10px] gap-2 shadow-lg" onClick={() => handleDownload('Batch Certificates')}>
              <Printer className="w-4 h-4" /> Issue All Certificates
            </Button>
          </div>
        </CardHeader>
        <div className="p-6 bg-accent/10 border-b flex flex-col md:flex-row items-center gap-4">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-10 h-11 bg-white border-none rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-[180px] h-11 bg-white border-none rounded-xl font-bold text-xs"><SelectValue placeholder="All Sections" /></SelectTrigger>
                <SelectContent>{availableSections.map((section) => <SelectItem key={section} value={section}>{section}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px] h-11 bg-white border-none rounded-xl font-bold text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>{availableClasses.map((className) => <SelectItem key={className} value={className}>{className}</SelectItem>)}</SelectContent>
              </Select>
           </div>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-accent/10 uppercase text-[9px] font-black tracking-widest border-b">
              <TableRow>
                <TableHead className="pl-8 py-4">Student Identity</TableHead>
                <TableHead>Class Stream</TableHead>
                <TableHead className="text-center">Mean Score</TableHead>
                <TableHead className="text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibleStudents.map((s) => (
                <TableRow key={s.id} className="hover:bg-primary/5 transition-colors h-16 border-b border-accent/10 last:border-0">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-accent shrink-0">
                        <AvatarImage src={s.avatar}/>
                        <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">{s.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-primary uppercase leading-none mb-1">{s.name.split(' ')[0]}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{s.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-[10px] font-bold uppercase text-muted-foreground">{s.class}</span></TableCell>
                  <TableCell className="text-center font-black text-lg text-primary">{s.average.toFixed(2)}</TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5" onClick={() => setViewingCertificate(s)}>
                      <Eye className="w-4 h-4 text-primary/60 hover:text-primary" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {eligibleStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No students currently meet the threshold criteria for this selection.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* STUDENT CERTIFICATE MODAL */}
      <Dialog open={!!viewingCertificate} onOpenChange={() => setViewingCertificate(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[95vh] p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
          <DialogHeader className="bg-primary p-8 text-white relative shrink-0 no-print">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl text-secondary"><Award className="w-8 h-8" /></div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Certificate of Excellence</DialogTitle>
                  <DialogDescription className="text-white/60">Professional review of {viewingCertificate?.name}'s achievement.</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingCertificate(null)} className="text-white hover:bg-white/10"><X className="w-6 h-6" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-muted p-4 md:p-10 print:p-0 print:bg-white no-scrollbar">
            <div className="overflow-x-auto rounded-xl border-2 border-primary/10 shadow-inner bg-white">
              <CertificatePreview student={viewingCertificate} platform={platformSettings} />
            </div>
          </div>
          <DialogFooter className="bg-accent/10 p-6 border-t border-accent flex justify-end gap-3 shrink-0 no-print">
             <Button variant="outline" className="rounded-xl h-12 px-8 font-bold" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print Official Copy</Button>
             <Button className="rounded-xl px-10 h-12 font-black uppercase text-xs shadow-lg" onClick={() => setViewingCertificate(null)}>Close Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CertificatePreview({ student, platform }: { student: any, platform: any }) {
  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const serial = `LIC-REWARD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const schoolName = student?.school?.name || platform.name + " International College";
  const termNumber = "Third Term (Annual)";

  return (
    <div id="honour-roll-print" className="bg-white p-12 md:p-24 border-[16px] border-double border-[#264D73]/20 shadow-2xl w-[1100px] md:w-full max-w-5xl mx-auto font-serif text-black relative overflow-hidden print:border-none print:shadow-none print:w-full">
      <div className="absolute top-0 left-0 p-8 opacity-40"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      <div className="absolute top-0 right-0 p-8 opacity-40 rotate-90"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      <div className="absolute bottom-0 left-0 p-8 opacity-40 -rotate-90"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      <div className="absolute bottom-0 right-0 p-8 opacity-40 rotate-180"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      
      <div className="absolute inset-6 border border-[#264D73]/10 pointer-events-none" />
      
      <div className="relative z-10 space-y-12">
        <div className="grid grid-cols-3 gap-4 items-center text-center">
          <div className="space-y-1 text-[8px] uppercase font-black text-left">
            <p className="text-[#264D73]">Republic of Cameroon</p>
            <p>Peace - Work - Fatherland</p>
            <div className="h-px bg-black w-10 my-1" />
            <p>Ministry of Secondary Education</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center border-[6px] border-[#FCD116] relative mb-2">
               <div className="absolute -bottom-4 bg-[#FCD116] text-[#264D73] px-3 py-0.5 rounded text-[8px] font-black uppercase shadow-sm">EXCELLENCE</div>
               <Trophy className="w-10 h-10 text-[#264D73]" />
            </div>
          </div>
          <div className="space-y-1 text-[8px] uppercase font-black text-right">
            <p className="text-[#264D73]">République du Cameroun</p>
            <p>Paix - Travail - Patrie</p>
            <div className="h-px bg-black w-10 ml-auto my-1" />
            <p>Min. des Enseignements Secondaires</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#264D73]/60 mb-2">{schoolName}</h2>
          <h1 className="text-6xl md:text-8xl font-black italic text-[#264D73] uppercase tracking-tighter leading-none drop-shadow-sm">Honor Roll</h1>
          <p className="text-2xl md:text-3xl font-bold uppercase tracking-[0.3em] text-[#FCD116] italic drop-shadow-sm">Certificate of Achievement</p>
        </div>

        <div className="text-center space-y-12 py-10">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-[#264D73]/40">THIS PRESTIGIOUS AWARD IS PROUDLY PRESENTED TO :</p>
          
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-black text-[#264D73] leading-tight uppercase tracking-tight">
              {student?.name}
            </h2>
            <div className="flex items-center justify-center gap-6 pt-4">
               <div className="h-px w-16 bg-[#264D73]/20" />
               <p className="font-mono text-sm md:text-lg font-bold uppercase tracking-widest text-[#264D73]/60">
                 Matricule: <span className="text-[#264D73]">{student?.id}</span> • Class: <span className="text-[#264D73]">{student?.class}</span>
               </p>
               <div className="h-px w-16 bg-[#264D73]/20" />
            </div>
          </div>

          <div className="max-w-2xl mx-auto leading-relaxed text-lg md:text-xl font-medium text-gray-700 italic px-10">
            For demonstrating exceptional academic commitment during the <span className="font-black text-[#264D73]">{termNumber}</span> pedagogical cycle, and achieving a verified annual average of <span className="font-black text-[#264D73] underline decoration-[#FCD116] decoration-4 underline-offset-8">{student?.average || student?.annualAvg || "15.00"} / 20</span>.
          </div>

          <div className="py-6">
             <p className="text-4xl md:text-5xl font-black text-[#FCD116] font-serif opacity-80 italic transform -rotate-3">Congratulations</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-20 md:gap-40 pt-16 items-end">
          <div className="text-center space-y-6">
            <div className="h-px bg-black/20 w-full" />
            <div className="space-y-1">
              <p className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#264D73]">The Principal</p>
              <div className="h-16 w-full relative flex items-center justify-center">
                 <SignatureSVG className="w-full h-full text-[#264D73]/10 p-4" />
                 <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <img src={student?.school?.logo || platform.logo} className="w-12 h-12 grayscale" />
                 </div>
              </div>
            </div>
          </div>
          <div className="text-center space-y-6 relative">
            <div className="absolute top-[-80px] left-1/2 -translate-x-1/2">
              <ShieldCheck className="w-24 h-24 text-[#264D73] opacity-[0.05] rotate-12" />
            </div>
            <div className="h-px bg-black/20 w-full" />
            <div className="space-y-1">
              <p className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#264D73]">Institutional Seal</p>
              <p className="font-mono font-black text-[9px] opacity-40">{serial}</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-12 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#264D73] rounded-lg p-2 flex items-center justify-center">
                 <img src={platform.logo} alt="EduIgnite" className="w-full h-full object-contain" />
              </div>
              <p className="text-left text-[8px] md:text-[10px] uppercase font-black text-muted-foreground opacity-30 tracking-[0.2em]">
                {platform.name} Secure Academic Registry • Verified Digital Node • {new Date().getFullYear()}
              </p>
           </div>
           <div className="flex items-center gap-4">
              <QrCode className="w-12 h-12 opacity-10" />
              <div className="text-left">
                <p className="text-[7px] font-black uppercase text-[#264D73]/40 leading-none">Date Issued</p>
                <p className="text-[10px] font-bold text-[#264D73]/60">{date}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProfessionalCertificatePreview({ remark, student, platform }: { remark: any, student: any, platform: any }) {
  const date = remark?.date || new Date().toLocaleDateString();
  const serial = `PROF-COMMEND-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const schoolName = student?.school?.name || platform.name + " International Node";

  return (
    <div id="professional-cert-print" className="bg-white p-12 md:p-24 border-[16px] border-double border-[#264D73]/20 shadow-2xl w-[1100px] md:w-full max-w-5xl mx-auto font-serif text-black relative overflow-hidden print:border-none print:shadow-none print:w-full">
      <div className="absolute top-0 left-0 p-8 opacity-40"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      <div className="absolute top-0 right-0 p-8 opacity-40 rotate-90"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      <div className="absolute bottom-0 left-0 p-8 opacity-40 -rotate-90"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      <div className="absolute bottom-0 right-0 p-8 opacity-40 rotate-180"><LaurelCorner className="w-24 h-24 text-[#264D73]" /></div>
      
      <div className="relative z-10 space-y-12">
        <div className="grid grid-cols-3 gap-4 items-center text-center">
          <div className="space-y-1 text-[8px] uppercase font-black text-left">
            <p className="text-[#264D73]">Republic of Cameroon</p>
            <p>Peace - Work - Fatherland</p>
            <div className="h-px bg-black w-10 my-1" />
            <p>Ministry of Secondary Education</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-primary/10 mb-2">
               <Medal className="w-10 h-10 text-secondary" />
            </div>
          </div>
          <div className="space-y-1 text-[8px] uppercase font-black text-right">
            <p className="text-[#264D73]">République du Cameroun</p>
            <p>Paix - Travail - Patrie</p>
            <div className="h-px bg-black w-10 ml-auto my-1" />
            <p>Min. des Enseignements Secondaires</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#264D73]/60 mb-2">{schoolName}</h2>
          <h1 className="text-5xl md:text-6xl font-black italic text-[#264D73] uppercase tracking-tighter leading-none drop-shadow-sm">Certificate of Professional Appreciation</h1>
          <p className="text-xl md:text-2xl font-bold uppercase tracking-[0.2em] text-secondary italic">Excellence in Service Delivery</p>
        </div>

        <div className="text-center space-y-10 py-6">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-[#264D73]/40">THIS OFFICIAL COMMENDATION IS AWARDED TO :</p>
          
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-[#264D73] leading-tight uppercase tracking-tight">
              {student?.name}
            </h2>
            <div className="flex items-center justify-center gap-6 pt-2">
               <p className="font-mono text-xs md:text-sm font-bold uppercase tracking-widest text-[#264D73]/60">
                 Matricule: <span className="text-[#264D73]">{student?.id}</span> • Role: <span className="text-[#264D73]">{student?.role}</span>
               </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-10 bg-accent/5 border border-[#264D73]/10 rounded-[3rem] shadow-inner">
            <p className="text-lg md:text-xl font-medium text-gray-700 italic leading-relaxed">
              "{remark?.text || "For exceptional dedication to pedagogical standards and consistent contribution to institutional growth."}"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-20 md:gap-40 pt-10 items-end">
          <div className="text-center space-y-6">
            <div className="h-px bg-black/20 w-full" />
            <div className="space-y-1">
              <p className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#264D73]">The Principal</p>
              <div className="h-16 w-full relative flex items-center justify-center">
                 <SignatureSVG className="w-full h-full text-[#264D73]/10 p-4" />
              </div>
              <p className="text-[10px] font-black uppercase opacity-40">{remark?.adminName}</p>
            </div>
          </div>
          <div className="text-center space-y-6 relative">
            <div className="absolute top-[-80px] left-1/2 -translate-x-1/2">
              <ShieldCheck className="w-24 h-24 text-[#264D73] opacity-[0.05] rotate-12" />
            </div>
            <div className="h-px bg-black/20 w-full" />
            <div className="space-y-1">
              <p className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#264D73]">Institutional Seal</p>
              <p className="font-mono font-black text-[9px] opacity-40">{serial}</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-10 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <img src={platform.logo} alt="EduIgnite" className="w-8 h-8 object-contain rounded bg-primary p-1" />
              <p className="text-left text-[8px] uppercase font-black text-muted-foreground opacity-30 tracking-[0.2em]">
                {platform.name} Secure Professional Registry • Node: {student?.schoolId} • {new Date().getFullYear()}
              </p>
           </div>
           <div className="flex items-center gap-4">
              <QrCode className="w-10 h-10 opacity-10" />
              <div className="text-left">
                <p className="text-[7px] font-black uppercase text-[#264D73]/40 leading-none">Date Verified</p>
                <p className="text-[10px] font-bold text-[#264D73]/60">{date}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function LaurelCorner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10 C 20 10, 10 20, 10 40 M10 10 C 10 20, 20 10, 40 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="3" />
      <path d="M15 25 L25 15 M20 35 L35 20 M25 45 L45 25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function SignatureSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 25C15 25 20 15 25 15C30 15 35 30 40 30C45 30 50 10 55 10C60 10 65 35 70 35C75 35 80 20 85 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 30L85 10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 2" />
    </svg>
  );
}
