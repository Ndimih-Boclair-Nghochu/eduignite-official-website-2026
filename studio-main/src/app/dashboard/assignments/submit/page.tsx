
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  FileText, 
  Clock, 
  BookOpen,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Award,
  Upload,
  X,
  ShieldCheck,
  FileCheck,
  QrCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SubmitAssignmentPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("id");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    // Simulate data fetch
    setTimeout(() => {
      setAssignment({
        id: "1",
        title: "Newton's Laws Lab Report",
        courseName: "Advanced Physics",
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        maxMarks: 20,
        type: "both", // text and file
        instructions: "Prepare a detailed laboratory report explaining the application of Newton's 2nd Law in the context of our last experiment. Include diagrams and calculated data."
      });
      setIsTaskLoading(false);
    }, 500);
  }, [assignmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 5MB." });
        return;
      }
      setSelectedFile(file);
      toast({ title: "File attached", description: file.name });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePageSubmit = async () => {
    if (assignment.type === 'text' && !content) return;
    if (assignment.type === 'file' && !selectedFile) return;
    if (assignment.type === 'both' && !content && !selectedFile) return;

    setLoading(true);
    // Simulate submission
    setTimeout(() => {
      setSubmission({
        content,
        fileName: selectedFile?.name,
        submittedAt: new Date(),
        status: "submitted"
      });
      setLoading(false);
      toast({
        title: language === 'en' ? 'Submission Received' : 'Travail Reçu',
        description: language === 'en' ? "Your pedagogical record has been updated." : "Votre dossier pédagogique a été mis à jour.",
      });
      
      // Navigate back after success
      setTimeout(() => router.push("/dashboard/assignments"), 1500);
    }, 1500);
  };

  if (isTaskLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
      <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest animate-pulse">Syncing Task Dossier</p>
    </div>
  );

  if (!assignment) return <div className="text-center py-20 font-bold">Assignment not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tighter">
             {language === 'en' ? 'Submission Suite' : 'Portail de Rendu'}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">{assignment.title} • {assignment.courseName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Instructions Box */}
          <Card className="border-none shadow-sm bg-accent/30 overflow-hidden rounded-3xl">
            <CardHeader className="bg-white/50 border-b p-6">
              <CardTitle className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Pedagogical Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                "{assignment.instructions}"
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="p-8 border-b">
              <CardTitle className="text-xl font-black text-primary">Submit Your Work</CardTitle>
              <CardDescription>Follow the institutional requirements for this task.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {submission ? (
                <div className="p-10 bg-green-50 rounded-[2rem] border-2 border-green-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-500">
                  <div className="p-4 bg-green-100 rounded-full shadow-inner">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-green-900">Work Successfully Recorded</h3>
                    <p className="text-sm text-green-800 font-medium">Your response has been timestamped and encrypted.</p>
                  </div>
                  <div className="pt-4 flex flex-col items-center gap-2 opacity-60">
                    <ShieldCheck className="w-6 h-6 text-green-700" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pedagogical Integrity Verified</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* TEXT AREA */}
                  {(assignment.type === 'text' || assignment.type === 'both') && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Written Response
                      </Label>
                      <Textarea 
                        placeholder="Type your academic summary or response here..." 
                        className="min-h-[300px] bg-accent/20 border-none rounded-2xl focus-visible:ring-primary p-6 text-base leading-relaxed font-medium"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      />
                    </div>
                  )}

                  {/* FILE UPLOAD */}
                  {(assignment.type === 'file' || assignment.type === 'both') && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5" /> Attach Supporting Documents
                      </Label>
                      
                      {!selectedFile ? (
                        <div 
                          className="group relative h-40 bg-accent/20 rounded-[2rem] border-2 border-dashed border-accent flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileChange}
                          />
                          <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform mb-3">
                            <Upload className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-xs font-bold text-primary/60">Click to browse or drag PDF/Images</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-black mt-1">MAX SIZE: 5MB</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <FileCheck className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary truncate max-w-[200px] md:max-w-sm">{selectedFile.name}</p>
                              <p className="text-[10px] font-black text-muted-foreground uppercase">{(selectedFile.size / 1024).toFixed(1)} KB • Ready to send</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-full text-red-400 hover:text-red-600 hover:bg-red-50" onClick={removeFile}>
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {!submission && (
              <CardFooter className="bg-accent/10 border-t p-8">
                <Button 
                  className="w-full h-16 text-lg font-black uppercase tracking-tighter shadow-xl gap-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95" 
                  onClick={handlePageSubmit}
                  disabled={loading || (assignment.type === 'text' && !content) || (assignment.type === 'file' && !selectedFile)}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  Finalize Submission
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-sm bg-primary text-white overflow-hidden rounded-[2rem]">
            <CardHeader className="bg-white/10 p-6 border-b border-white/5">
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-60">Assignment Registry</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex gap-4">
                <div className="p-3 bg-white/10 rounded-2xl h-fit">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Submission Deadline</p>
                  <p className="text-lg font-black text-secondary leading-none">{new Date(assignment.dueDate).toLocaleDateString()}</p>
                  <p className="text-[10px] font-bold opacity-60 italic">Standard Institutional Window</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-white/10 rounded-2xl h-fit">
                  <Award className="w-6 h-6 text-secondary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Pedagogical Weight</p>
                  <p className="text-2xl font-black leading-none">{assignment.maxMarks} Points</p>
                  <p className="text-[10px] font-bold opacity-60 italic">Sequence 2 Evaluation Cycle</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col items-center text-center gap-4">
                 <QrCode className="w-24 h-24 opacity-10" />
                 <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Digital ID Reference</p>
                    <Badge variant="outline" className="border-white/20 text-white font-mono text-[9px]">TSK-{assignment.id}-2024</Badge>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-blue-50 rounded-[2rem] p-6 space-y-4">
             <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h4 className="text-xs font-black uppercase text-blue-700">Submission Notice</h4>
             </div>
             <p className="text-[11px] text-blue-800 leading-relaxed font-medium italic">
               "Students are advised to review their work carefully. Once submitted, records are finalized and sent to the pedagogical council for review. Late submissions are not permitted by the system architecture."
             </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
