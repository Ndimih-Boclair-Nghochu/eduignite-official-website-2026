"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersService } from "@/lib/api/services/users.service";
import { schoolsService } from "@/lib/api/services/schools.service";

const EXECUTIVE_STAFF_CREATION_ROLES = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN"];
const SCHOOL_ADMIN_STAFF_CREATION_ROLES = ["SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN", "PARENT"];

const normalizeResults = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

// API Hooks
const useUsers = (params: any) => {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      return normalizeResults(await usersService.getUsers(params));
    },
    initialData: [],
  });
};

const useStaffRemarks = (params: any) => {
  return useQuery({
    queryKey: ["remarks", params],
    queryFn: async () => {
      const { staffRemarksService } = await import("@/lib/api/services/staff-remarks.service");
      return normalizeResults(await staffRemarksService.getRemarks(params));
    },
    initialData: [],
  });
};

const useMyRemarks = () => {
  return useQuery({
    queryKey: ["my-remarks"],
    queryFn: async () => {
      const { staffRemarksService } = await import("@/lib/api/services/staff-remarks.service");
      return normalizeResults(await staffRemarksService.getMyRemarks());
    },
    initialData: [],
  });
};

const useCreateRemark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (remark: any) => {
      const { staffRemarksService } = await import("@/lib/api/services/staff-remarks.service");
      return staffRemarksService.createRemark({
        staff: remark.staffId,
        text: remark.message,
        remark_type: remark.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remarks"] });
    },
  });
};

const useAcknowledgeRemark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (remarkId: string) => {
      const { staffRemarksService } = await import("@/lib/api/services/staff-remarks.service");
      return staffRemarksService.acknowledgeRemark(remarkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remarks"] });
      queryClient.invalidateQueries({ queryKey: ["my-remarks"] });
    },
  });
};

const useSchools = () => {
  return useQuery({
    queryKey: ["staff-school-options"],
    queryFn: async () => normalizeResults(await schoolsService.getSchools()),
    initialData: [],
  });
};

const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => usersService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

const REMARK_TYPES = [
  { value: "Commendation", label: "Commendation", color: "bg-green-100 text-green-700" },
  { value: "Warning", label: "Warning", color: "bg-amber-100 text-amber-700" },
  { value: "Suspension", label: "Suspension", color: "bg-red-100 text-red-700" },
  { value: "Praise", label: "Praise", color: "bg-blue-100 text-blue-700" },
];

export default function StaffPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isRemarkDialogOpen, setIsRemarkDialogOpen] = useState(false);
  const [isCreateStaffDialogOpen, setIsCreateStaffDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdStaff, setCreatedStaff] = useState<any>(null);

  const [newRemark, setNewRemark] = useState({
    staffId: "",
    type: "Commendation",
    message: "",
  });

  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    role: "TEACHER",
    school: "",
    password: "",
    passwordConfirm: "",
  });

  const isAdmin = ["SCHOOL_ADMIN", "SUB_ADMIN"].includes(user?.role || "");
  const isExecutive = ["SUPER_ADMIN", "CEO", "CTO", "COO"].includes(user?.role || "");
  const creationRoles = isExecutive ? EXECUTIVE_STAFF_CREATION_ROLES : SCHOOL_ADMIN_STAFF_CREATION_ROLES;

  useEffect(() => {
    if (isAdmin && user?.school?.id) {
      setNewStaff((current) => ({
        ...current,
        school: user.school?.id || "",
        role: creationRoles.includes(current.role) ? current.role : "TEACHER",
      }));
    }
  }, [creationRoles, isAdmin, user?.school?.id]);

  // Fetch staff list
  const { data: staffList = [] } = useUsers({
    role: "TEACHER,BURSAR,LIBRARIAN,SUB_ADMIN",
  });
  const { data: schoolOptions = [] } = useSchools();

  // Fetch remarks
  const { data: remarksList = [] } = useStaffRemarks({
    search: searchTerm,
  });

  const { data: myRemarks = [] } = useMyRemarks();

  const createRemarkMutation = useCreateRemark();
  const acknowledgeRemarkMutation = useAcknowledgeRemark();
  const createUserMutation = useCreateUser();

  const filteredStaff = staffList
    .filter((staff: any) => ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN", "PARENT"].includes(staff.role))
    .filter((s: any) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleCreateRemark = async () => {
    if (!newRemark.staffId || !newRemark.message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill all fields",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await createRemarkMutation.mutateAsync(newRemark);
      setIsProcessing(false);
      setIsRemarkDialogOpen(false);
      setNewRemark({ staffId: "", type: "Commendation", message: "" });
      toast({ title: "Remark Created", description: "Staff member has been notified." });
    } catch (error) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Error", description: "Failed to create remark" });
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeRemarkMutation.mutateAsync(id);
      toast({ title: "Acknowledged", description: "Remark has been acknowledged." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to acknowledge." });
    }
  };

  const handleCreateStaff = async () => {
    if (
      !newStaff.name ||
      !newStaff.email ||
      !newStaff.role ||
      !newStaff.password ||
      !newStaff.passwordConfirm ||
      !(newStaff.school || user?.school?.id)
    ) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please complete all required staff fields.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const created = await createUserMutation.mutateAsync({
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
        phone: newStaff.phone.trim() || undefined,
        whatsapp: newStaff.whatsapp.trim() || undefined,
        role: newStaff.role,
        school: newStaff.school || user?.school?.id,
        password: newStaff.password,
        password_confirm: newStaff.passwordConfirm,
      });

      setCreatedStaff(created);
      setIsCreateStaffDialogOpen(false);
      setNewStaff({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        role: "TEACHER",
        school: isAdmin ? user?.school?.id || "" : "",
        password: "",
        passwordConfirm: "",
      });
      toast({
        title: "Staff Created",
        description: "The account is ready. Share the matricule with the staff member.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Staff Creation Failed",
        description:
          error?.response?.data?.detail ||
          error?.response?.data?.password_confirm?.[0] ||
          error?.response?.data?.password?.[0] ||
          "Unable to create the staff account.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg text-white">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage faculty, remarks, and institutional staff.</p>
        </div>
        {(isExecutive || isAdmin) && (
          <Button className="gap-2 shadow-xl h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs" onClick={() => setIsCreateStaffDialogOpen(true)}>
            <Plus className="w-5 h-5" /> Create Staff Account
          </Button>
        )}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full md:w-[400px] mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-3xl grid-cols-2">
          <TabsTrigger value="list" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
            <Users className="w-4 h-4" /> Staff List
          </TabsTrigger>
          <TabsTrigger value="remarks" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
            <MessageSquare className="w-4 h-4" /> Remarks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
            <Search className="w-4 h-4 text-muted-foreground ml-2" />
            <Input
              placeholder="Search staff by name or ID..."
              className="border-none bg-transparent focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStaff.map((staff: any) => (
              <Card key={staff.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white rounded-[2rem] overflow-hidden group">
                <CardHeader className="flex flex-row items-center gap-4 pb-6">
                  <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/10 shadow-lg shrink-0">
                    <AvatarImage src={staff.avatar} alt={staff.name} />
                    <AvatarFallback className="bg-primary text-white font-black text-xl">{staff.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden flex-1">
                    <CardTitle className="text-lg font-black text-primary leading-tight uppercase truncate">{staff.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-[8px] h-5 border-primary/10 text-primary font-bold uppercase">
                      {staff.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="py-6 border-y border-accent/50 space-y-3 bg-accent/5">
                  <p className="text-[10px] font-bold text-muted-foreground">{staff.email}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{staff.phone}</p>
                </CardContent>

                <div className="p-4 flex justify-between items-center">
                  <Badge className="bg-green-100 text-green-700 text-[8px] h-5 font-black border-none">Active</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="remarks" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {isAdmin ? (
              remarksList.map((remark: any) => (
                <Card key={remark.id} className="border-none shadow-xl overflow-hidden bg-white rounded-[2rem] group hover:shadow-2xl transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-72 bg-accent/20 border-r p-6 flex flex-col items-center text-center space-y-4 shrink-0">
                        <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                        <AvatarImage src={remark.staffAvatar || remark.staff_avatar || remark.staff?.avatar} />
                        <AvatarFallback className="bg-primary text-white text-2xl font-bold">{(remark.staffName || remark.staff_name || remark.staff?.name)?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="font-black text-primary text-sm uppercase leading-tight">{remark.staffName || remark.staff_name || remark.staff?.name}</h3>
                      </div>
                      <Badge className={cn("w-full justify-center py-1 font-black uppercase text-[9px]", REMARK_TYPES.find(t => t.value === (remark.type || remark.remark_type))?.color || "bg-gray-100 text-gray-700")}>
                        {remark.type || remark.remark_type}
                      </Badge>
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col">
                      <div className="bg-white/50 border border-accent rounded-2xl p-6 italic text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                        "{remark.message || remark.text}"
                      </div>
                      <div className="pt-4 border-t flex justify-between items-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <Clock className="w-3 h-3 inline mr-1" /> {new Date(remark.createdAt || remark.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              myRemarks.map((remark: any) => (
                <Card key={remark.id} className="border-none shadow-xl overflow-hidden bg-white rounded-[2rem] group hover:shadow-2xl transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-72 bg-accent/20 border-r p-6 flex flex-col items-center text-center space-y-4 shrink-0">
                      <div className="p-3 bg-primary rounded-xl text-white">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <Badge className={cn("w-full justify-center py-1 font-black uppercase text-[9px]", REMARK_TYPES.find(t => t.value === (remark.type || remark.remark_type))?.color || "bg-gray-100 text-gray-700")}>
                        {remark.type || remark.remark_type}
                      </Badge>
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col">
                      <div className="bg-white/50 border border-accent rounded-2xl p-6 italic text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                        "{remark.message || remark.text}"
                      </div>
                      <div className="pt-4 border-t flex justify-between items-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <Clock className="w-3 h-3 inline mr-1" /> {new Date(remark.createdAt || remark.created_at).toLocaleString()}
                        </span>
                        <Button
                          className="gap-2 shadow-lg"
                          onClick={() => handleAcknowledge(remark.id)}
                          disabled={remark.acknowledged}
                        >
                          <CheckCircle2 className="w-4 h-4" /> {remark.acknowledged ? "Acknowledged" : "Acknowledge"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateStaffDialogOpen} onOpenChange={setIsCreateStaffDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Create Staff Account</DialogTitle>
            <DialogDescription className="text-white/70">
              Provision a school-level account and generate a matricule for activation.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className="h-12 bg-accent/30 border-none rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
                <Input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} className="h-12 bg-accent/30 border-none rounded-xl font-bold" type="email" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</Label>
                <Input value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} className="h-12 bg-accent/30 border-none rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                <Input value={newStaff.whatsapp} onChange={(e) => setNewStaff({ ...newStaff, whatsapp: e.target.value })} className="h-12 bg-accent/30 border-none rounded-xl font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Role</Label>
                <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                  <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-bold">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {creationRoles.map((role) => (
                      <SelectItem key={role} value={role}>{role.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">School</Label>
                <Select value={newStaff.school} onValueChange={(value) => setNewStaff({ ...newStaff, school: value })} disabled={isAdmin}>
                  <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-bold">
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isAdmin ? schoolOptions.filter((school: any) => school.id === user?.school?.id) : schoolOptions).map((school: any) => (
                      <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Temporary Password</Label>
                <Input value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} className="h-12 bg-accent/30 border-none rounded-xl font-bold" type="password" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                <Input value={newStaff.passwordConfirm} onChange={(e) => setNewStaff({ ...newStaff, passwordConfirm: e.target.value })} className="h-12 bg-accent/30 border-none rounded-xl font-bold" type="password" />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
            <Button onClick={handleCreateStaff} className="w-full h-14 rounded-2xl shadow-lg font-black uppercase tracking-widest text-xs gap-3 bg-primary text-white hover:bg-primary/90" disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Creating...</span></> : <><ShieldCheck className="w-5 h-5 text-secondary" /><span>Create Staff & Generate Matricule</span></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdStaff} onOpenChange={() => setCreatedStaff(null)}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">Staff Account Ready</DialogTitle>
            <DialogDescription>
              Share this matricule with the staff member so they can activate the account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/10 bg-accent/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Generated Matricule</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-primary">{createdStaff?.matricule}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-5 space-y-2">
              <p className="text-sm font-bold text-primary">{createdStaff?.name}</p>
              <p className="text-xs text-muted-foreground">{createdStaff?.email}</p>
              <Badge variant="outline" className="text-[10px] border-primary/10 text-primary font-bold uppercase">
                {createdStaff?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
