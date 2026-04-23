
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCreateSubject, useDeleteSubject, useSubjects } from "@/lib/hooks/useGrades";
import { useUsers } from "@/lib/hooks/useUsers";
import { useSchoolSettings } from "@/lib/hooks/useSchools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  User, 
  Plus, 
  Search, 
  Eye, 
  CheckCircle2, 
  Loader2,
  Trash2,
  Sparkles,
  BookMarked,
  ChevronRight,
  ArrowLeft,
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  Upload,
  Clock,
  ShieldCheck,
  Filter,
  Image as ImageIcon,
  File as FileIcon,
  X,
  Radio,
  PenTool,
  Users,
  Building2,
  GraduationCap,
  History,
  QrCode,
  MapPin,
  XCircle
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SECTIONS = ["Anglophone Section", "Francophone Section", "Technical Section"];

const SECTION_CLASSES: Record<string, string[]> = {
  "Anglophone Section": ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Lower Sixth", "Upper Sixth"],
  "Francophone Section": ["6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"],
  "Technical Section": ["1ère Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "6th Year", "7th Year"]
};

const MOCK_TEACHERS: any[] = [];

const INITIAL_COURSES: any[] = [];

const INITIAL_MATERIALS: any[] = [];

function encodeSubjectPlacement(section: string, targetClasses: string[]) {
  return `${section}||${targetClasses.join(", ")}`;
}

function parseSubjectPlacement(level?: string) {
  const raw = (level || "").trim();
  if (!raw) {
    return { section: "General", targetClass: "All Classes", targetClasses: [] as string[] };
  }
  if (!raw.includes("||")) {
    return { section: "General", targetClass: raw, targetClasses: raw.split(",").map((item) => item.trim()).filter(Boolean) };
  }
  const [section, classes] = raw.split("||");
  const targetClasses = (classes || "").split(",").map((item) => item.trim()).filter(Boolean);
  return {
    section: section?.trim() || "General",
    targetClass: targetClasses.join(", ") || "All Classes",
    targetClasses,
  };
}

export default function CoursesPage() {
  const { user, platformSettings } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEnrollingOptional, setIsEnrollingOptional] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [viewingMaterialsFor, setViewingMaterialsFor] = useState<any>(null);
  const [viewingPortfolio, setViewingPortfolio] = useState<any>(null);
  const [materials, setMaterials] = useState(INITIAL_MATERIALS);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  
  // Material Upload State
  const [uploadSource, setUploadSource] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMaterialData, setNewMaterialData] = useState({ 
    title: "", 
    description: "", 
    type: "pdf", 
    url: "" 
  });

  const [previewMaterial, setPreviewMaterial] = useState<any>(null);
  const [myOptionalSubjects, setMyOptionalSubjects] = useState<string[]>([]);
  
  const [newSubject, setNewSubject] = useState({
    name: "",
    id: "",
    instructorId: "",
    instructorName: "",
    instructorAvatar: "",
    targetClasses: [] as string[],
    section: "General",
    type: "mandatory",
    coefficient: 1,
    color: "bg-blue-500"
  });

  const isTeacher = user?.role === "TEACHER";
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const isSubAdmin = user?.role === "SUB_ADMIN";
  const isAdmin = isSchoolAdmin || isSubAdmin;
  const isStudent = user?.role === "STUDENT";
  const { data: schoolSettings } = useSchoolSettings(user?.school?.id || "");

  // Fetch subjects from API
  const { data: subjectsData, isLoading: subjectsLoading } = useSubjects();
  const { data: teachersData } = useUsers({ role: 'TEACHER' });
  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();

  const availableSections = useMemo(
    () => schoolSettings?.sections?.filter(Boolean)?.length ? schoolSettings.sections : SECTIONS,
    [schoolSettings]
  );

  const availableClasses = useMemo(
    () => schoolSettings?.class_levels?.filter(Boolean)?.length ? schoolSettings.class_levels : Array.from(new Set(Object.values(SECTION_CLASSES).flat())),
    [schoolSettings]
  );

  useEffect(() => {
    setNewSubject((current) => {
      if (availableSections.includes(current.section)) {
        return current;
      }
      return { ...current, section: availableSections[0] || "General", targetClasses: [] };
    });
  }, [availableSections]);

  useEffect(() => {
    if (subjectsData?.results) {
      // Map API subjects to the course format used by this page
      const mapped = subjectsData.results.map((s: any) => ({
        ...parseSubjectPlacement(s.level),
        id: s.id,
        code: s.code || s.id,
        subjectId: s.id,
        name: s.name,
        instructorId: s.teacher || "",
        instructorName: s.teacher_name || "Unassigned",
        instructorAvatar: `https://picsum.photos/seed/${s.code || s.id}/200/200`,
        type: s.coefficient >= 4 ? "mandatory" : "optional",
        coefficient: s.coefficient || 1,
        color: ["bg-blue-500","bg-emerald-500","bg-purple-500","bg-rose-500","bg-amber-500"][
          Math.abs(s.name.charCodeAt(0)) % 5
        ],
        stats: { exams: 0, attendance: 0, liveScheduled: 0, liveCompleted: 0, liveCancelled: 0 }
      }));
      setSubjects(mapped.length > 0 ? mapped : INITIAL_COURSES);
    } else if (!subjectsLoading) {
      setSubjects(INITIAL_COURSES);
    }
    setIsLoading(subjectsLoading);
  }, [subjectsData, subjectsLoading]);

  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.id || !newSubject.instructorId || newSubject.targetClasses.length === 0) {
      toast({ 
        variant: "destructive", 
        title: "Incomplete Form", 
        description: "Subject Name, ID, Instructor, and at least one target class are required." 
      });
      return;
    }
    setIsProcessing(true);
    try {
      await createSubjectMutation.mutateAsync({
        code: newSubject.id,
        coefficient: newSubject.coefficient,
        is_active: true,
        level: encodeSubjectPlacement(newSubject.section, newSubject.targetClasses),
        name: newSubject.name,
        teacher: newSubject.instructorId,
      });
      setIsProcessing(false);
      setIsAddingSubject(false);
      setNewSubject({ 
        name: "", 
        id: "", 
        instructorId: "",
        instructorName: "", 
        instructorAvatar: "",
        targetClasses: [], 
        section: availableSections[0] || "General", 
        type: "mandatory", 
        coefficient: 1,
        color: "bg-blue-500" 
      });
      toast({ title: "Subject Registered", description: `${newSubject.name} added to curriculum.` });
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Subject creation failed",
        description: error?.response?.data?.detail || error?.response?.data?.code?.[0] || "Could not save this subject assignment.",
      });
    }
  };

  const handleEnrollOptional = (subjectId: string) => {
    if (myOptionalSubjects.includes(subjectId)) {
      toast({ variant: "destructive", title: "Already Enrolled" });
      return;
    }
    setMyOptionalSubjects([...myOptionalSubjects, subjectId]);
    toast({ title: "Enrollment Confirmed", description: "This subject has been added to your curriculum." });
    setIsEnrollingOptional(false);
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubjectMutation.mutateAsync(id);
      toast({ title: "Removed", description: "Subject removed from curriculum." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error?.response?.data?.detail || "Could not remove this subject right now.",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type?: 'logo' | 'banner') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 5MB." });
        return;
      }
      setSelectedFile(file);
      if (!newMaterialData.title) {
        setNewMaterialData({ ...newMaterialData, title: file.name.split('.')[0] });
      }
    }
  };

  const handleAddMaterial = () => {
    if (!newMaterialData.title) return;
    if (uploadSource === 'url' && !newMaterialData.url) return;
    if (uploadSource === 'file' && !selectedFile) return;

    setIsProcessing(true);
    setTimeout(() => {
      const created = {
        id: `M-${Math.random().toString(36).substr(2, 5)}`,
        title: newMaterialData.title,
        description: newMaterialData.description,
        type: newMaterialData.type,
        date: new Date().toISOString().split('T')[0],
        size: uploadSource === 'file' ? `${(selectedFile!.size / (1024 * 1024)).toFixed(1)} MB` : "Link",
        subjectId: viewingMaterialsFor.id,
        fileUrl: uploadSource === 'url' ? newMaterialData.url : "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      };
      setMaterials([created, ...materials]);
      setIsProcessing(false);
      setIsAddingMaterial(false);
      setNewMaterialData({ title: "", description: "", type: "pdf", url: "" });
      setSelectedFile(null);
      toast({ title: "Material Uploaded", description: "Resource added to class archive." });
    }, 1200);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
    toast({ title: "Material Removed", description: "Resource deleted from subject library." });
  };

  const handleViewMaterial = (material: any) => {
    if (!material.fileUrl) {
      toast({ variant: "destructive", title: "Resource Unavailable", description: "This file does not have a valid source URL." });
      return;
    }

    if (material.type === 'pdf' || material.type === 'document' || material.type === 'link') {
      window.open(material.fileUrl, '_blank');
    } else {
      setPreviewMaterial(material);
    }
  };

  const handleDownloadMaterial = (material: any) => {
    if (!material.fileUrl) {
      toast({ variant: "destructive", title: "Download Failed", description: "Source URL is missing." });
      return;
    }

    const link = document.createElement('a');
    link.href = material.fileUrl;
    link.setAttribute('download', `${material.title}.${material.type}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Download Started", description: `Preparing ${material.title} for offline access.` });
  };

  const visibleSubjects = useMemo(() => {
    if (isSchoolAdmin) return subjects;
    if (isSubAdmin) return subjects;
    return subjects;
  }, [subjects, isSchoolAdmin, isSubAdmin]);

  if (viewingMaterialsFor) {
    const subjectMaterials = materials.filter(m => m.subjectId === viewingMaterialsFor.id);
    
    return (
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setViewingMaterialsFor(null)} className="rounded-full hover:bg-white shadow-sm">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[9px] font-black border-none text-white", viewingMaterialsFor.color)}>{viewingMaterialsFor.id}</Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline tracking-tight">{viewingMaterialsFor.name}</h1>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{language === 'en' ? 'Course Dossier & Analytics' : 'Dossier de Cours & Analyses'}</p>
            </div>
          </div>
          
          {isTeacher && (
            <Dialog open={isAddingMaterial} onOpenChange={setIsAddingMaterial}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg h-12 px-8 rounded-2xl bg-primary text-white font-bold">
                  <Upload className="w-5 h-5" /> {language === 'en' ? 'Upload Material' : 'Ajouter un Support'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="bg-primary p-8 text-white">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl"><BookMarked className="w-8 h-8 text-secondary" /></div>
                    <div>
                      <DialogTitle className="text-2xl font-black">Publish Resource</DialogTitle>
                      <DialogDescription className="text-white/60">Upload new pedagogical material for students.</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Upload Source</Label>
                    <div className="flex gap-2 p-1 bg-accent/30 rounded-xl">
                      <Button 
                        variant={uploadSource === 'file' ? 'default' : 'ghost'} 
                        className={cn("flex-1 rounded-lg h-10 font-bold", uploadSource === 'file' && "bg-white text-primary shadow-sm")}
                        onClick={() => setUploadSource('file')}
                      >
                        <FileIcon className="w-4 h-4 mr-2" /> Local File
                      </Button>
                      <Button 
                        variant={uploadSource === 'url' ? 'default' : 'ghost'} 
                        className={cn("flex-1 rounded-lg h-10 font-bold", uploadSource === 'url' && "bg-white text-primary shadow-sm")}
                        onClick={() => setUploadSource('url')}
                      >
                        <LinkIcon className="w-4 h-4 mr-2" /> External URL
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Resource Title</Label>
                      <Input 
                        value={newMaterialData.title} 
                        onChange={(e) => setNewMaterialData({...newMaterialData, title: e.target.value})} 
                        placeholder="e.g. Chapter 4 Summary" 
                        className="h-12 bg-accent/30 border-none rounded-xl font-bold"
                      />
                    </div>

                    {uploadSource === 'file' ? (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Select File</Label>
                        {!selectedFile ? (
                          <div 
                            className="group relative h-32 bg-accent/20 rounded-2xl border-2 border-dashed border-accent flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            <Upload className="w-6 h-6 text-primary/40 group-hover:scale-110 transition-transform mb-2" />
                            <p className="text-xs font-bold text-primary/60">Click to browse or drag file</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-black mt-1">MAX SIZE: 5MB</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-primary truncate max-w-[200px]">{selectedFile.name}</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => setSelectedFile(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Source URL</Label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                          <Input 
                            value={newMaterialData.url} 
                            onChange={(e) => setNewMaterialData({...newMaterialData, url: e.target.value})} 
                            placeholder="https://..." 
                            className="h-12 bg-accent/30 border-none rounded-xl pl-10"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Content Type</Label>
                        <Select value={newMaterialData.type} onValueChange={(v) => setNewMaterialData({...newMaterialData, type: v})}>
                          <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF Document</SelectItem>
                            <SelectItem value="video">Lecture Video</SelectItem>
                            <SelectItem value="image">Image / Diagram</SelectItem>
                            <SelectItem value="document">Text File</SelectItem>
                            <SelectItem value="link">Web Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Brief Context</Label>
                        <Input 
                          value={newMaterialData.description} 
                          onChange={(e) => setNewMaterialData({...newMaterialData, description: e.target.value})} 
                          placeholder="What is this?" 
                          className="h-12 bg-accent/30 border-none rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
                  <Button onClick={handleAddMaterial} disabled={isProcessing || !newMaterialData.title || (uploadSource === 'url' && !newMaterialData.url) || (uploadSource === 'file' && !selectedFile)} className="w-full h-14 rounded-2xl shadow-xl font-black uppercase tracking-widest text-xs gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Finalize Upload
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-4 border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-primary p-6 text-white text-center pb-8 relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-2xl mb-4">
                  <AvatarImage src={viewingMaterialsFor.instructorAvatar} alt={viewingMaterialsFor.instructorName} />
                  <AvatarFallback>{viewingMaterialsFor.instructorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-lg font-black">{viewingMaterialsFor.instructorName}</CardTitle>
                <Badge variant="secondary" className="bg-white/10 text-white border-none mt-2 uppercase text-[8px] tracking-widest">Lead Instructor</Badge>
              </CardHeader>
              <CardContent className="p-6 -mt-4 bg-white rounded-t-3xl space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Strategic Purview</p>
                  <p className="text-sm font-bold text-primary">{viewingMaterialsFor.name} Department</p>
                </div>
                <div className="pt-4 border-t flex justify-between items-center">
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase w-full shadow-sm hover:bg-primary/5 transition-all"
                    onClick={() => setViewingPortfolio(viewingMaterialsFor)}
                   >
                    View Professional Portfolio
                   </Button>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-sm bg-purple-50/50 group hover:shadow-md transition-all">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Online Exams</p>
                    <PenTool className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-3xl font-black text-purple-700">{viewingMaterialsFor.stats?.exams || 0}</div>
                  <p className="text-[9px] font-bold text-purple-600/60 uppercase mt-1">Assessments Published</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-emerald-50/50 group hover:shadow-md transition-all">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Attendance</p>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-3xl font-black text-emerald-700">{viewingMaterialsFor.stats?.attendance || 0}%</div>
                  <p className="text-[9px] font-bold text-emerald-600/60 uppercase mt-1">Student Average</p>
                </CardContent>
              </Card>
              
              {/* Virtual Pedagogical Metrics */}
              <Card className="border-none shadow-sm bg-blue-50/50 group hover:shadow-md transition-all">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Scheduled Live</p>
                    <Video className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-3xl font-black text-blue-700">{viewingMaterialsFor.stats?.liveScheduled || 0}</div>
                  <p className="text-[9px] font-bold text-blue-600/60 uppercase mt-1">Upcoming Virtual Nodes</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-green-50/50 group hover:shadow-md transition-all">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">Sessions Held</p>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-3xl font-black text-green-700">{viewingMaterialsFor.stats?.liveCompleted || 0}</div>
                  <p className="text-[9px] font-bold text-green-600/60 uppercase mt-1">Completed Lectures</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-red-50/50 group hover:shadow-md transition-all">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Cancelled</p>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-3xl font-black text-red-700">{viewingMaterialsFor.stats?.liveCancelled || 0}</div>
                  <p className="text-[9px] font-bold text-red-600/60 uppercase mt-1">Decommissioned Slots</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-primary/10" />
            <h2 className="text-sm font-black uppercase text-primary/40 tracking-[0.3em]">Pedagogical Materials</h2>
            <div className="h-px flex-1 bg-primary/10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectMaterials.map((material) => (
              <Card key={material.id} className="border-none shadow-sm group hover:shadow-md transition-all overflow-hidden bg-white flex flex-col">
                <div className="p-6 flex items-start gap-4 flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    material.type === 'pdf' ? "bg-red-50 text-red-600" :
                    material.type === 'video' ? "bg-blue-50 text-blue-600" :
                    material.type === 'image' ? "bg-purple-50 text-purple-600" :
                    material.type === 'link' ? "bg-emerald-50 text-emerald-600" :
                    "bg-amber-50 text-amber-600"
                  )}>
                    {material.type === 'pdf' ? <FileText className="w-6 h-6" /> :
                     material.type === 'video' ? <Video className="w-6 h-6" /> :
                     material.type === 'image' ? <ImageIcon className="w-6 h-6" /> :
                     material.type === 'link' ? <LinkIcon className="w-6 h-6" /> :
                     <FileIcon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary text-base leading-tight truncate mb-1">{material.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {material.description || "No description provided for this resource."}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {material.date}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span>{material.size}</span>
                    </div>
                  </div>
                </div>
                <CardFooter className="bg-accent/10 p-3 border-t flex items-center justify-between gap-2">
                  <div className="flex flex-1 gap-2">
                    <Button 
                      variant="ghost" 
                      className="flex-1 h-9 rounded-lg hover:bg-white text-primary text-[10px] font-black uppercase tracking-widest gap-2"
                      onClick={() => handleViewMaterial(material)}
                    >
                      <Eye className="w-3.5 h-3.5" /> {language === 'en' ? 'View' : 'Voir'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 h-9 rounded-lg hover:bg-white text-primary text-[10px] font-black uppercase tracking-widest gap-2"
                      onClick={() => handleDownloadMaterial(material)}
                    >
                      <Download className="w-3.5 h-3.5" /> {language === 'en' ? 'Download' : 'Télécharger'}
                    </Button>
                  </div>
                  {isTeacher && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-destructive/20 hover:text-destructive hover:bg-red-50" onClick={() => handleDeleteMaterial(material.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={!!previewMaterial} onOpenChange={() => setPreviewMaterial(null)}>
          <DialogContent className="sm:max-w-4xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-black">
            <DialogHeader className="p-6 bg-white/5 text-white absolute top-0 left-0 right-0 z-10 backdrop-blur-md border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary rounded-xl text-white">
                    {previewMaterial?.type === 'video' ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black">{previewMaterial?.title}</DialogTitle>
                    <DialogDescription className="text-white/40 text-xs">{previewMaterial?.description}</DialogDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPreviewMaterial(null)} className="text-white/40 hover:text-white hover:bg-white/10">
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </DialogHeader>
            <div className="aspect-video w-full flex items-center justify-center bg-slate-900 pt-20">
              {previewMaterial?.type === 'video' ? (
                <video 
                  controls 
                  autoPlay 
                  className="w-full h-full max-h-[70vh] object-contain"
                  src={previewMaterial.fileUrl}
                />
              ) : previewMaterial?.type === 'image' ? (
                <img 
                  src={previewMaterial.fileUrl} 
                  alt={previewMaterial.title}
                  className="w-full h-full max-h-[70vh] object-contain"
                />
              ) : null}
            </div>
            <DialogFooter className="bg-white/5 p-6 border-t border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                EduIgnite Secure Viewer
              </div>
              <Button 
                variant="secondary" 
                className="gap-2 rounded-xl font-bold"
                onClick={() => handleDownloadMaterial(previewMaterial)}
              >
                <Download className="w-4 h-4" /> Download Original
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingPortfolio} onOpenChange={() => setViewingPortfolio(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
            <DialogHeader className="bg-primary p-8 text-white shrink-0 relative">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-2xl shrink-0">
                  <AvatarImage src={viewingPortfolio?.instructorAvatar} />
                  <AvatarFallback className="text-3xl font-black text-primary bg-white">{viewingPortfolio?.instructorName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter">{viewingPortfolio?.instructorName}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-secondary text-primary border-none font-black h-6">PEDAGOGICAL LEAD</Badge>
                    <Badge variant="outline" className="border-white/20 text-white font-mono text-[10px]">PROF-REF-2024</Badge>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingPortfolio(null)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X className="w-6 h-6" />
              </Button>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto bg-white p-8 md:p-12 space-y-12 no-scrollbar">
               <div className="grid grid-cols-3 gap-2 text-center border-b pb-6 opacity-40">
                  <div className="text-[7px] font-black uppercase">Republic of Cameroon</div>
                  <div className="flex justify-center"><Building2 className="w-4 h-4" /></div>
                  <div className="text-[7px] font-black uppercase">République du Cameroun</div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-10">
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-accent pb-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-black uppercase text-primary tracking-widest">Academic Credentials</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-primary text-base">PhD in Theoretical Physics</p>
                            <p className="text-xs text-muted-foreground">University of Yaoundé I • 2018</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold">CERTIFIED</Badge>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <Card className="border-none shadow-sm bg-accent/20 rounded-3xl overflow-hidden">
                      <CardHeader className="bg-primary/5 p-6 border-b">
                        <CardTitle className="text-xs font-black uppercase text-primary tracking-widest">Pedagogical Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase opacity-60">Pass Rate</span>
                          <span className="text-lg font-black text-green-600">94%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
               </div>
            </div>

            <DialogFooter className="bg-accent/10 p-6 border-t border-accent shrink-0">
               <Button onClick={() => setViewingPortfolio(null)} className="rounded-xl px-10 h-12 font-black uppercase text-xs">Close Dossier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const mandatorySubjects = visibleSubjects.filter(s => s.type === "mandatory");
  const enrolledOptional = visibleSubjects.filter(s => s.type === "optional" && (isAdmin || isTeacher || myOptionalSubjects.includes(s.id)));
  const availableOptional = visibleSubjects.filter(s => s.type === "optional" && !myOptionalSubjects.includes(s.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <BookOpen className="w-6 h-6 text-secondary" />
            </div>
            {isAdmin ? (language === 'en' ? "Institutional Subjects" : "Matières Institutionnelles") : t("courses")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? "Monitor pedagogical activity, resources, and performance for all courses."
              : "Manage your class subjects and access learning materials."}
          </p>
        </div>
        
        {(isSchoolAdmin || isSubAdmin) && (
          <Dialog open={isAddingSubject} onOpenChange={setIsAddingSubject}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg h-12 px-6 rounded-2xl">
                <Plus className="w-5 h-5" /> Add New Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-primary p-8 text-white">
                <DialogTitle className="text-2xl font-black">Setup New Subject</DialogTitle>
                <DialogDescription className="text-white/60">Configure curriculum requirements and instructor assignment.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto text-foreground">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Subject Name</Label>
                    <Input value={newSubject.name} onChange={(e) => setNewSubject({...newSubject, name: e.target.value})} placeholder="e.g. Advanced Physics" className="h-11 bg-accent/30 border-none rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Subject ID (Code)</Label>
                    <Input value={newSubject.id} onChange={(e) => setNewSubject({...newSubject, id: e.target.value})} placeholder="e.g. PHY101" className="h-11 bg-accent/30 border-none rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Coefficient</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={newSubject.coefficient} 
                      onChange={(e) => setNewSubject({...newSubject, coefficient: parseInt(e.target.value) || 1})} 
                      className="h-11 bg-accent/30 border-none rounded-xl font-black text-primary" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Assigned Teacher</Label>
                    <Select value={newSubject.instructorId} onValueChange={(value) => {
                      const teacher = (teachersData?.results || MOCK_TEACHERS).find((item: any) => (item.id || item.user?.id) === value);
                      setNewSubject({
                        ...newSubject,
                        instructorId: value,
                        instructorName: teacher?.name || teacher?.user?.name || "",
                        instructorAvatar: teacher?.avatar || teacher?.user?.avatar || "",
                      })
                    }}>
                      <SelectTrigger className="h-11 bg-accent/30 border-none rounded-xl font-bold">
                        <SelectValue placeholder="Select Instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {(teachersData?.results || MOCK_TEACHERS).map((t: any) => (
                          <SelectItem key={t.id || t.user?.id} value={t.id || t.user?.id}>{t.name || t.user?.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Subject Type</Label>
                    <Select value={newSubject.type} onValueChange={(v) => setNewSubject({...newSubject, type: v as any})}>
                      <SelectTrigger className="h-11 bg-accent/30 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mandatory">Mandatory</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Sub-School / Section</Label>
                    <Select value={newSubject.section} onValueChange={(v) => setNewSubject({...newSubject, section: v, targetClasses: []})}>
                      <SelectTrigger className="h-11 bg-accent/30 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableSections.map((section) => <SelectItem key={section} value={section}>{section}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Classes (Select All That Apply)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-accent/20 rounded-2xl border border-accent/50 max-h-[200px] overflow-y-auto">
                      {availableClasses.map((cls) => (
                        <div key={cls} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`cls-${cls}`} 
                            checked={newSubject.targetClasses.includes(cls)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewSubject({...newSubject, targetClasses: [...newSubject.targetClasses, cls]})
                              } else {
                                setNewSubject({...newSubject, targetClasses: newSubject.targetClasses.filter(c => c !== cls)})
                              }
                            }}
                          />
                          <Label htmlFor={`cls-${cls}`} className="text-xs font-bold cursor-pointer leading-none">{cls}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
                <Button onClick={handleCreateSubject} className="w-full h-14 rounded-2xl shadow-xl font-black uppercase tracking-widest text-xs gap-2" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Register Subject to Curriculum
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isStudent && (
          <Dialog open={isEnrollingOptional} onOpenChange={setIsEnrollingOptional}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2 shadow-lg h-12 px-6 rounded-2xl bg-secondary text-primary hover:bg-secondary/90">
                <Plus className="w-5 h-5" /> {t("addSubject")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-primary p-8 text-white">
                <DialogTitle className="text-2xl font-black">{t("availableSubjects")}</DialogTitle>
                <DialogDescription className="text-white/60">Elective courses available for your class level.</DialogDescription>
              </DialogHeader>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableOptional.map((course) => (
                    <Card key={course.id} className="border border-accent hover:border-primary/20 transition-all group cursor-pointer" onClick={() => handleEnrollOptional(course.id)}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white", course.color)}>
                          <BookMarked className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-sm truncate">{course.name}</p>
                          <p className="text-[10px] text-muted-foreground">{course.instructorName}</p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" /></div>
      ) : (
        <div className="space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-primary/10" />
              <h2 className="text-sm font-black uppercase text-primary/40 tracking-[0.3em]">{language === 'en' ? 'Mandatory Subjects' : 'Matières Obligatoires'}</h2>
              <div className="h-px flex-1 bg-primary/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {mandatorySubjects.map((course) => (
                <CourseCard key={course.subjectId || course.id} course={course} isAdmin={isAdmin} onDelete={() => handleDeleteSubject(course.subjectId || course.id)} onViewMaterials={() => setViewingMaterialsFor(course)} />
              ))}
            </div>
          </section>

          {(isAdmin || isTeacher || enrolledOptional.length > 0) && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-primary/10" />
                <h2 className="text-sm font-black uppercase text-primary/40 tracking-[0.3em]">{language === 'en' ? 'Optional Subjects' : 'Matières Facultatives'}</h2>
                <div className="h-px flex-1 bg-primary/10" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {enrolledOptional.map((course) => (
                  <CourseCard key={course.subjectId || course.id} course={course} isAdmin={isAdmin} onDelete={() => handleDeleteSubject(course.subjectId || course.id)} onViewMaterials={() => setViewingMaterialsFor(course)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, isAdmin, onDelete, onViewMaterials }: { course: any, isAdmin: boolean, onDelete: () => void, onViewMaterials: () => void }) {
  const { language } = useI18n();
  
  return (
    <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow bg-white">
      <div className={cn("h-2", course.color || 'bg-blue-500')} />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-bold">{course.code || course.id}</Badge>
              <Badge className={cn(
                "text-[9px] uppercase font-black border-none h-4 px-2",
                course.type === 'mandatory' ? "bg-primary text-white" : "bg-secondary text-primary"
              )}>
                {course.type}
              </Badge>
              <Badge variant="secondary" className="text-[9px] font-black border-none h-4 px-2 bg-accent text-primary">Coef: {course.coefficient}</Badge>
            </div>
            <CardTitle className="text-xl font-black text-primary tracking-tight">{course.name}</CardTitle>
          </div>
          <div className="p-2 bg-accent/50 rounded-lg"><BookOpen className="w-5 h-5 text-primary" /></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Instructor</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-accent shrink-0">
                <AvatarImage src={course.instructorAvatar} alt={course.instructorName} />
                <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                  {course.instructorName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-bold truncate text-primary/80">{course.instructorName}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Section</p>
            <p className="text-xs font-black text-primary/80 pt-1.5">{course.section}</p>
          </div>
        </div>
        <div className="pt-2">
           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Target Classes</p>
           <p className="text-xs font-bold text-primary/60">{course.targetClass || "All Streams"}</p>
        </div>
      </CardContent>
      <CardFooter className="bg-accent/30 border-t border-accent/50 pt-4 flex gap-2">
        <Button variant="ghost" className="flex-1 justify-between hover:bg-white h-10 group/btn" onClick={onViewMaterials}>
          <span className="flex items-center gap-2 font-bold text-xs">
            <Eye className="w-4 h-4" /> {isAdmin ? 'Course Suite' : (language === 'en' ? 'Materials' : 'Supports')}
          </span>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
        </Button>
        {isAdmin && (
          <Button variant="ghost" size="icon" className="text-destructive/20 hover:text-destructive hover:bg-destructive/5" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
