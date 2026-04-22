"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateStudent,
  useHonourRoll,
  useStudents,
  useUpdateStudent,
} from "@/lib/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Loader2, Plus, Search, Sparkles, Upload, UserPlus, Users } from "lucide-react";
import type { BulkStudentUploadRequest, CreateStudentRequest, Student, UpdateStudentRequest } from "@/lib/api/types";
import { studentsService } from "@/lib/api/services/students.service";

const CLASS_LEVEL_OPTIONS = [
  { value: "form1", label: "Form 1" },
  { value: "form2", label: "Form 2" },
  { value: "form3", label: "Form 3" },
  { value: "form4", label: "Form 4" },
  { value: "form5", label: "Form 5" },
  { value: "lower_sixth", label: "Lower Sixth" },
  { value: "upper_sixth", label: "Upper Sixth" },
];

const SECTION_OPTIONS = [
  { value: "general", label: "General" },
  { value: "bilingual", label: "Bilingual" },
  { value: "technical", label: "Technical" },
  { value: "science", label: "Science" },
  { value: "arts", label: "Arts" },
  { value: "commercial", label: "Commercial" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

const emptyForm: CreateStudentRequest = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  password: "",
  student_class: "",
  class_level: "form1",
  section: "general",
  date_of_birth: "",
  gender: "male",
  guardian_name: "",
  guardian_phone: "",
  guardian_whatsapp: "",
  admission_number: "",
  admission_date: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  parent_whatsapp: "",
  parent_relationship: "guardian",
  create_parent_account: false,
};

type AdmissionResult = {
  id?: string;
  user?: {
    name?: string;
  };
  student_matricule?: string;
  parent_matricule?: string | null;
};

type BulkUploadResult = {
  created_count?: number;
  failed_count?: number;
  detail?: string;
  document_html?: string;
  generated_students?: Array<{
    id: string;
    matricule: string;
    student_class: string;
    class_level: string;
    section: string;
    department?: string;
    stream?: string;
  }>;
  created_students?: Array<{
    id: string;
    name: string;
    matricule: string;
    admission_number: string;
  }>;
  failed_rows?: Array<{
    row: number;
    name?: string;
    reason?: string;
    errors?: unknown;
  }>;
};

function studentInitials(student: Student) {
  const name = student.user?.name || "Student";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [createdResult, setCreatedResult] = useState<AdmissionResult | null>(null);
  const [formData, setFormData] = useState<CreateStudentRequest>(emptyForm);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editData, setEditData] = useState<UpdateStudentRequest>({});
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkData, setBulkData] = useState<BulkStudentUploadRequest>({
    student_class: "",
    generation_count: 30,
    class_level: undefined,
    section: undefined,
    department: "",
    stream: "",
    batch_name: "",
  });

  const studentsQuery = useStudents({
    search: searchTerm || undefined,
    ordering: "user__name",
  });
  const honourRollQuery = useHonourRoll();
  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();

  const students = studentsQuery.data?.results ?? [];
  const honourRoll = Array.isArray(honourRollQuery.data)
    ? honourRollQuery.data
    : honourRollQuery.data?.results ?? [];

  const activeEnrollment = studentsQuery.data?.count ?? students.length;
  const linkedParents = useMemo(
    () => students.filter((student: any) => (student.parent_count ?? 0) > 0).length,
    [students]
  );

  useEffect(() => {
    if (editingStudent) {
      setEditData({
        name: editingStudent.user?.name ?? "",
        email: editingStudent.user?.email ?? "",
        phone: editingStudent.user?.phone ?? "",
        whatsapp: editingStudent.user?.whatsapp ?? "",
        student_class: editingStudent.student_class ?? "",
        class_level: editingStudent.class_level ?? "form1",
        section: editingStudent.section ?? "general",
        date_of_birth: editingStudent.date_of_birth ?? "",
        gender: (editingStudent.gender?.toLowerCase?.() as "male" | "female" | "other") ?? "male",
        guardian_name: editingStudent.guardian_name ?? "",
        guardian_phone: editingStudent.guardian_phone ?? "",
        guardian_whatsapp: (editingStudent as any).guardian_whatsapp ?? "",
      });
    }
  }, [editingStudent]);

  const handleChange = (field: keyof CreateStudentRequest, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetAdmissionForm = () => {
    setFormData({
      ...emptyForm,
      admission_date: "",
    });
  };

  const openAdmissionDialog = () => {
    resetAdmissionForm();
    setIsAdmissionOpen(true);
  };

  const handleSubmitAdmission = async () => {
    if (
      !formData.name.trim() ||
      !formData.student_class.trim()
    ) {
      toast({
        variant: "destructive",
        title: "Incomplete registration",
        description: "Student name and class are the minimum required details for first admission.",
      });
      return;
    }

    try {
      const created = await createStudentMutation.mutateAsync({
        ...formData,
        school: user?.school?.id,
      });

      if ((created as any)?.id) {
        await downloadAdmissionForm((created as any).id, (created as any)?.user?.name || formData.name || "student");
      }

      setCreatedResult({
        ...(created as any),
        student_matricule: (created as any)?.student_matricule,
        parent_matricule: (created as any)?.parent_matricule,
      });
      setIsAdmissionOpen(false);
      resetAdmissionForm();
      toast({
        title: "Student registered",
        description: "The student profile, school linkage, and optional parent account were created successfully.",
      });
    } catch (error: any) {
      const firstError =
        error?.response?.data?.detail ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.admission_number?.[0] ||
        error?.response?.data?.parent_email?.[0] ||
        "The student registration could not be completed.";
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: firstError,
      });
    }
  };

  const downloadAdmissionForm = async (studentId: string, studentName: string) => {
    try {
      const blob = await studentsService.downloadAdmissionForm(studentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${studentName.replace(/\s+/g, "_").toLowerCase()}_admission.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "We could not generate the admission document right now.",
      });
    }
  };

  const downloadActivationSheet = (html: string, className: string) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(className || "student_activation_sheet").replace(/\s+/g, "_").toLowerCase()}_activation_sheet.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkData.student_class.trim() || !bulkData.generation_count || bulkData.generation_count < 1) {
      toast({
        variant: "destructive",
        title: "Matricule generation incomplete",
        description: "Provide the target class and the number of matricules to generate.",
      });
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const result = await studentsService.bulkUploadStudents(bulkData);
      setBulkResult(result);
      if (result.document_html) {
        downloadActivationSheet(result.document_html, bulkData.student_class);
      }
      toast({
        title: "Matricules generated",
        description: result.detail || `${result.created_count || 0} matricules were generated for ${bulkData.student_class}.`,
      });
    } catch (error: any) {
      const responseData = error?.response?.data as BulkUploadResult | undefined;
      setBulkResult(responseData || null);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description:
          responseData?.detail ||
          responseData?.failed_rows?.[0]?.reason ||
          "We could not generate the class matricules.",
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    try {
      await updateStudentMutation.mutateAsync({
        id: editingStudent.id,
        data: editData,
      });
      toast({
        title: "Student updated",
        description: "The learner record was updated successfully.",
      });
      setEditingStudent(null);
      setEditData({});
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description:
          error?.response?.data?.detail ||
          error?.response?.data?.email?.[0] ||
          "We could not save the learner changes.",
      });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-primary font-headline">
            <div className="rounded-xl bg-primary p-2 text-white shadow-lg">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            Student Admissions
          </h1>
          <p className="mt-1 text-muted-foreground">
            Register learners, link guardians and parents, and keep a clean school-wide registry.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="h-14 gap-2 rounded-2xl px-6 font-black uppercase tracking-widest text-xs" onClick={() => setIsBulkOpen(true)}>
            <FileText className="h-5 w-5" />
            Generate Matricules
          </Button>
          <Button className="h-14 gap-2 rounded-2xl px-8 font-black uppercase tracking-widest text-xs shadow-xl" onClick={openAdmissionDialog}>
            <Plus className="h-5 w-5" />
            Register Student
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{activeEnrollment}</div>
            <p className="text-xs text-muted-foreground">Students currently linked to {user?.school?.name || "your school"}.</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parent Linkage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{linkedParents}</div>
            <p className="text-xs text-muted-foreground">Students already tied to at least one parent account.</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Honour Roll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{honourRoll.length}</div>
            <p className="text-xs text-muted-foreground">Learners currently above the school honour-roll threshold.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 rounded-3xl border bg-white p-1.5 shadow-sm">
          <TabsTrigger value="registry" className="rounded-2xl py-3 font-bold">
            Student Registry
          </TabsTrigger>
          <TabsTrigger value="honour-roll" className="rounded-2xl py-3 font-bold">
            Honour Roll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="mt-6 space-y-6">
          <div className="flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm">
            <Search className="ml-1 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by learner name, email, matricule, or admission number..."
              className="border-none bg-transparent focus-visible:ring-0"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {studentsQuery.isLoading ? (
              <Card className="border-none shadow-sm lg:col-span-2">
                <CardContent className="flex h-40 items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading student registry...</span>
                </CardContent>
              </Card>
            ) : students.length === 0 ? (
              <Card className="border-none shadow-sm lg:col-span-2">
                <CardContent className="flex h-40 flex-col items-center justify-center gap-3 text-center">
                  <UserPlus className="h-10 w-10 text-primary/30" />
                  <div>
                    <p className="font-bold text-primary">No students found yet</p>
                    <p className="text-sm text-muted-foreground">Use the registration flow to onboard your first learner.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              students.map((student) => (
                <Card key={student.id} className="overflow-hidden rounded-[2rem] border-none shadow-xl">
                  <CardHeader className="flex flex-row items-start gap-4 pb-4">
                    <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/10 shadow-lg">
                      <AvatarImage src={student.user?.avatar} alt={student.user?.name} />
                      <AvatarFallback className="bg-primary text-lg font-black text-white">
                        {studentInitials(student)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-lg font-black uppercase text-primary">
                        {student.user?.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {student.user?.email || "No email"} · {student.admission_number}
                      </CardDescription>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-primary/10 text-[10px] font-bold uppercase text-primary">
                          {student.student_class}
                        </Badge>
                        <Badge className="bg-secondary/15 text-[10px] font-bold uppercase text-primary">
                          {student.class_level.replace("_", " ")}
                        </Badge>
                        {((student as any).parent_count ?? 0) > 0 ? (
                          <Badge className="bg-green-100 text-[10px] font-bold uppercase text-green-700">
                            {(student as any).parent_count} parent link
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-[10px] font-bold uppercase text-amber-700">
                            No parent linked yet
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 rounded-2xl bg-accent/10 p-4 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Guardian</p>
                        <p className="font-semibold text-primary">{student.guardian_name}</p>
                        <p className="text-xs text-muted-foreground">{student.guardian_phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student Matricule</p>
                        <p className="font-semibold text-primary">{student.user?.matricule || "Pending"}</p>
                        <p className="text-xs text-muted-foreground">Admission date: {student.admission_date}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" className="rounded-xl border-primary/10 font-bold text-primary" onClick={() => downloadAdmissionForm(student.id, student.user?.name || "student")}>
                        Download Admission Form
                      </Button>
                      <Button variant="outline" className="rounded-xl border-primary/10 font-bold text-primary" onClick={() => setEditingStudent(student)}>
                        Edit Learner
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="honour-roll" className="mt-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black uppercase text-primary">
                <Sparkles className="h-5 w-5 text-secondary" />
                Honour Roll
              </CardTitle>
              <CardDescription>Students meeting the academic recognition threshold configured for this school.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {honourRollQuery.isLoading ? (
                <div className="flex items-center gap-3 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading honour roll...</span>
                </div>
              ) : honourRoll.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground">No learners have reached the honour-roll threshold yet.</p>
              ) : (
                honourRoll.map((student: any) => (
                  <div key={student.id} className="flex items-center justify-between rounded-2xl border p-4">
                    <div>
                      <p className="font-bold text-primary">{student.user?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.student_class} · {student.admission_number}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">{student.annual_average}/20</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAdmissionOpen} onOpenChange={setIsAdmissionOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[2rem] border-none p-0 shadow-2xl sm:max-w-4xl">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase">Register Student</DialogTitle>
            <DialogDescription className="text-white/70">
              Complete the school admission form and optionally create the parent activation account immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 p-8">
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Learner Identity</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Full Name</Label><Input value={formData.name} onChange={(event) => handleChange("name", event.target.value)} /></div>
                <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" value={formData.email || ""} onChange={(event) => handleChange("email", event.target.value)} placeholder="Leave blank to auto-generate a temporary student email" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone || ""} onChange={(event) => handleChange("phone", event.target.value)} /></div>
                <div className="space-y-2"><Label>WhatsApp</Label><Input value={formData.whatsapp || ""} onChange={(event) => handleChange("whatsapp", event.target.value)} /></div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.date_of_birth || ""} onChange={(event) => handleChange("date_of_birth", event.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value as CreateStudentRequest["gender"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GENDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Admission Placement</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Admission Number (optional)</Label><Input value={formData.admission_number || ""} onChange={(event) => handleChange("admission_number", event.target.value)} placeholder="Leave blank to auto-generate" /></div>
                <div className="space-y-2"><Label>Admission Date (optional)</Label><Input type="date" value={formData.admission_date || ""} onChange={(event) => handleChange("admission_date", event.target.value)} /></div>
                <div className="space-y-2"><Label>Class Name</Label><Input placeholder="Form 5 Science" value={formData.student_class} onChange={(event) => handleChange("student_class", event.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Class Level</Label>
                  <Select value={formData.class_level} onValueChange={(value) => handleChange("class_level", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASS_LEVEL_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={(value) => handleChange("section", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SECTION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Initial Password</Label><Input type="password" placeholder="Optional. Leave empty for activation later." value={formData.password || ""} onChange={(event) => handleChange("password", event.target.value)} /></div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Guardian Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Guardian Name (optional)</Label><Input value={formData.guardian_name || ""} onChange={(event) => handleChange("guardian_name", event.target.value)} /></div>
                <div className="space-y-2"><Label>Guardian Phone (optional)</Label><Input value={formData.guardian_phone || ""} onChange={(event) => handleChange("guardian_phone", event.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Guardian WhatsApp (optional)</Label><Input value={formData.guardian_whatsapp || ""} onChange={(event) => handleChange("guardian_whatsapp", event.target.value)} /></div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border bg-accent/10 p-4">
                <div>
                  <p className="font-bold text-primary">Create parent account now</p>
                  <p className="text-xs text-muted-foreground">Generate a linked parent login and activation matricule immediately.</p>
                </div>
                <Switch checked={!!formData.create_parent_account} onCheckedChange={(checked) => handleChange("create_parent_account", checked)} />
              </div>

              {formData.create_parent_account && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Parent Name</Label><Input value={formData.parent_name || ""} onChange={(event) => handleChange("parent_name", event.target.value)} /></div>
                  <div className="space-y-2"><Label>Parent Email</Label><Input type="email" value={formData.parent_email || ""} onChange={(event) => handleChange("parent_email", event.target.value)} /></div>
                  <div className="space-y-2"><Label>Parent Phone</Label><Input value={formData.parent_phone || ""} onChange={(event) => handleChange("parent_phone", event.target.value)} /></div>
                  <div className="space-y-2"><Label>Parent WhatsApp</Label><Input value={formData.parent_whatsapp || ""} onChange={(event) => handleChange("parent_whatsapp", event.target.value)} /></div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Relationship</Label>
                    <Select value={formData.parent_relationship || "guardian"} onValueChange={(value) => handleChange("parent_relationship", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RELATIONSHIP_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </section>
          </div>
          <DialogFooter className="border-t bg-accent/20 p-6">
            <Button onClick={handleSubmitAdmission} disabled={createStudentMutation.isPending} className="h-14 w-full gap-3 rounded-2xl font-black uppercase tracking-widest text-xs">
              {createStudentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
              Save Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[2rem] border-none p-0 shadow-2xl sm:max-w-3xl">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase">Generate Student Matricules</DialogTitle>
            <DialogDescription className="text-white/70">
              Choose the class placement and number of activation matricules. The platform prepares a printable activation sheet immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Class</Label>
                <Input value={bulkData.student_class} onChange={(event) => setBulkData((current) => ({ ...current, student_class: event.target.value }))} placeholder="Form 1 A" />
              </div>
              <div className="space-y-2">
                <Label>Number of Matricules</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={bulkData.generation_count || ""}
                  onChange={(event) => setBulkData((current) => ({ ...current, generation_count: Number(event.target.value || 0) }))}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Class Level (optional)</Label>
                <Select value={bulkData.class_level} onValueChange={(value) => setBulkData((current) => ({ ...current, class_level: value }))}>
                  <SelectTrigger><SelectValue placeholder="Auto-detect from class name" /></SelectTrigger>
                  <SelectContent>{CLASS_LEVEL_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section (optional)</Label>
                <Select value={bulkData.section} onValueChange={(value) => setBulkData((current) => ({ ...current, section: value }))}>
                  <SelectTrigger><SelectValue placeholder="Auto-detect or default to General" /></SelectTrigger>
                  <SelectContent>{SECTION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department (optional)</Label>
                <Input value={bulkData.department || ""} onChange={(event) => setBulkData((current) => ({ ...current, department: event.target.value }))} placeholder="Science Department" />
              </div>
              <div className="space-y-2">
                <Label>Stream (optional)</Label>
                <Input value={bulkData.stream || ""} onChange={(event) => setBulkData((current) => ({ ...current, stream: event.target.value }))} placeholder="General Education" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Batch Name (optional)</Label>
                <Input value={bulkData.batch_name || ""} onChange={(event) => setBulkData((current) => ({ ...current, batch_name: event.target.value }))} placeholder="Form 1 A - 2026 Intake" />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-accent/10 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-black uppercase tracking-widest text-primary">How It Works</p>
              <p>Each matricule is single-use and remains attached to the selected class, section, and level.</p>
              <p>If a matricule has already been used, the activation flow now tells the student that the matricule is already used.</p>
              <p>The downloaded activation sheet can be printed directly or saved as PDF from the browser.</p>
            </div>

            {bulkResult && (
              <Card className="border border-primary/10 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-black text-primary">Matricule Generation Result</CardTitle>
                  <CardDescription>
                    {bulkResult.detail || `${bulkResult.created_count} created, ${bulkResult.failed_count} failed.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(bulkResult.generated_students || []).slice(0, 20).map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="font-bold text-primary">{student.student_class}</p>
                        <p className="text-xs text-muted-foreground">{student.matricule} · {student.class_level?.replace?.("_", " ") || student.class_level}</p>
                      </div>
                      <Badge variant="outline" className="border-primary/10 font-bold text-primary uppercase">
                        {student.section}
                      </Badge>
                    </div>
                  ))}
                  {(bulkResult.created_students || []).slice(0, 10).map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="font-bold text-primary">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.matricule} · {student.admission_number}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-primary/10 font-bold text-primary"
                        onClick={() => downloadAdmissionForm(student.id, student.name || "student")}
                      >
                        Download Form
                      </Button>
                    </div>
                  ))}
                  {(bulkResult.failed_rows || []).slice(0, 10).map((row: any) => (
                    <div key={`failed-${row.row}`} className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      Row {row.row}{row.name ? ` (${row.name})` : ""}: {row.reason || "This row failed validation."}
                    </div>
                  ))}
                  {bulkResult.document_html && (
                    <Button
                      variant="outline"
                      className="rounded-xl border-primary/10 font-bold text-primary"
                      onClick={() => downloadActivationSheet(bulkResult.document_html || "", bulkData.student_class)}
                    >
                      Download Activation Sheet
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter className="border-t bg-accent/20 p-6">
            <Button onClick={handleBulkUpload} disabled={isBulkSubmitting} className="h-14 w-full gap-3 rounded-2xl font-black uppercase tracking-widest text-xs">
              {isBulkSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              Generate Matricules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="rounded-[2rem] border-none p-0 shadow-2xl sm:max-w-2xl">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase">Edit Student</DialogTitle>
            <DialogDescription className="text-white/70">Keep the learner, guardian, and class details accurate across the school system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 p-8 md:grid-cols-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={(editData.name as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={(editData.email as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, email: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={(editData.phone as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, phone: event.target.value }))} /></div>
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={(editData.whatsapp as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, whatsapp: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Class Name</Label><Input value={(editData.student_class as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, student_class: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Class Level</Label>
              <Select value={(editData.class_level as string) || "form1"} onValueChange={(value) => setEditData((current) => ({ ...current, class_level: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASS_LEVEL_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={(editData.section as string) || "general"} onValueChange={(value) => setEditData((current) => ({ ...current, section: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SECTION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={(editData.date_of_birth as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, date_of_birth: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={(editData.gender as string) || "male"} onValueChange={(value) => setEditData((current) => ({ ...current, gender: value as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Guardian Name</Label><Input value={(editData.guardian_name as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, guardian_name: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Guardian Phone</Label><Input value={(editData.guardian_phone as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, guardian_phone: event.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Guardian WhatsApp</Label><Input value={(editData.guardian_whatsapp as string) || ""} onChange={(event) => setEditData((current) => ({ ...current, guardian_whatsapp: event.target.value }))} /></div>
          </div>
          <DialogFooter className="border-t bg-accent/20 p-6">
            <Button onClick={handleSaveEdit} disabled={updateStudentMutation.isPending} className="h-14 w-full gap-3 rounded-2xl font-black uppercase tracking-widest text-xs">
              {updateStudentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdResult} onOpenChange={() => setCreatedResult(null)}>
        <DialogContent className="rounded-[2rem] border-none p-8 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-primary">Admission Complete</DialogTitle>
            <DialogDescription>Share these matricules so the new accounts can activate and log in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="border border-primary/10 shadow-none">
              <CardContent className="p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student Matricule</p>
                <p className="mt-2 text-3xl font-black text-primary">{createdResult?.student_matricule || "Pending"}</p>
                {createdResult?.id && (
                  <Button variant="outline" className="mt-4 rounded-xl border-primary/10 font-bold text-primary" onClick={() => downloadAdmissionForm(createdResult.id, createdResult?.user?.name || "student")}>
                    Download Admission Form
                  </Button>
                )}
              </CardContent>
            </Card>
            {createdResult?.parent_matricule && (
              <Card className="border border-primary/10 shadow-none">
                <CardContent className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parent Matricule</p>
                  <p className="mt-2 text-3xl font-black text-primary">{createdResult.parent_matricule}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
