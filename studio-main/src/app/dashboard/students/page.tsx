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
import { Loader2, Plus, Search, Sparkles, UserPlus, Users } from "lucide-react";
import type { CreateStudentRequest, Student, UpdateStudentRequest } from "@/lib/api/types";

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
  student_matricule?: string;
  parent_matricule?: string | null;
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
      admission_date: new Date().toISOString().slice(0, 10),
    });
  };

  const openAdmissionDialog = () => {
    resetAdmissionForm();
    setIsAdmissionOpen(true);
  };

  const handleSubmitAdmission = async () => {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.student_class.trim() ||
      !formData.guardian_name.trim() ||
      !formData.guardian_phone.trim() ||
      !formData.admission_number.trim() ||
      !formData.admission_date
    ) {
      toast({
        variant: "destructive",
        title: "Incomplete registration",
        description: "Complete the learner, guardian, class, and admission details before submitting.",
      });
      return;
    }

    try {
      const created = await createStudentMutation.mutateAsync({
        ...formData,
        school: user?.school?.id,
      });

      setCreatedResult({
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
        <Button className="h-14 gap-2 rounded-2xl px-8 font-black uppercase tracking-widest text-xs shadow-xl" onClick={openAdmissionDialog}>
          <Plus className="h-5 w-5" />
          Register Student
        </Button>
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
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(event) => handleChange("email", event.target.value)} /></div>
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
                <div className="space-y-2"><Label>Admission Number</Label><Input value={formData.admission_number} onChange={(event) => handleChange("admission_number", event.target.value)} /></div>
                <div className="space-y-2"><Label>Admission Date</Label><Input type="date" value={formData.admission_date} onChange={(event) => handleChange("admission_date", event.target.value)} /></div>
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
                <div className="space-y-2"><Label>Guardian Name</Label><Input value={formData.guardian_name} onChange={(event) => handleChange("guardian_name", event.target.value)} /></div>
                <div className="space-y-2"><Label>Guardian Phone</Label><Input value={formData.guardian_phone} onChange={(event) => handleChange("guardian_phone", event.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Guardian WhatsApp</Label><Input value={formData.guardian_whatsapp || ""} onChange={(event) => handleChange("guardian_whatsapp", event.target.value)} /></div>
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
