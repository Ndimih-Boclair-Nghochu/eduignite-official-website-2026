
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Settings2,
  Loader2,
  Globe,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Download,
  Printer,
  X,
  Ban,
  MapPin,
  User,
  Mail,
  Fingerprint,
  Lock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// API Hooks
const useSchools = () => {
  return useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/schools`);
      return data;
    },
    initialData: [],
  });
};

const useSchoolStats = () => {
  return useQuery({
    queryKey: ["school-stats"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/schools/stats`);
      return data;
    },
    initialData: {},
  });
};

const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (school: any) => {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/schools`, school);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
};

const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...school }: any) => {
      const { data } = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/schools/${id}`, school);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
};

const useToggleSchoolStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/schools/${id}/toggle-status`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
};

export default function SchoolsManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: schools = [] } = useSchools();
  const { data: schoolStats = {} } = useSchoolStats();
  const createSchoolMutation = useCreateSchool();
  const toggleSchoolStatusMutation = useToggleSchoolStatus();
  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/schools/${id}`);
      return data;
    },
    onSuccess: () => {
      useSchools().refetch?.();
    },
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [managedSchool, setManagedSchool] = useState<any>(null);
  const [onboardingSuccess, setOnboardingSuccess] = useState<any>(null);
  
  const [newSchoolData, setNewSchoolData] = useState({
    name: "",
    shortName: "",
    principal: "",
    email: "",
    motto: "Discipline - Work - Success",
    description: "New Institutional Node",
    logo: "https://picsum.photos/seed/newschool/200/200",
    banner: "https://picsum.photos/seed/school-banner/1200/400"
  });

  const isCEO = user?.role === "CEO" || user?.role === "SUPER_ADMIN";

  const filteredSchools = (schools || []).filter((s: any) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveSchool = async () => {
    if (!newSchoolData.name || !newSchoolData.principal || !newSchoolData.shortName || !newSchoolData.email) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please complete all required fields." });
      return;
    }

    setIsProcessing(true);
    try {
      const created = await createSchoolMutation.mutateAsync(newSchoolData);
      setIsProcessing(false);
      setIsAddModalOpen(false);
      setOnboardingSuccess(created);
      setNewSchoolData({
        name: "",
        shortName: "",
        principal: "",
        email: "",
        motto: "Discipline - Work - Success",
        description: "New Institutional Node",
        logo: "https://picsum.photos/seed/newschool/200/200",
        banner: "https://picsum.photos/seed/school-banner/1200/400"
      });
      toast({ title: "Node Provisioned", description: "Institution successfully onboarded to the network." });
    } catch (error) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Error", description: "Failed to create school" });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg text-white">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            Institutional Nodes
          </h1>
          <p className="text-muted-foreground mt-1">Manage and monitor institutional dashboard instances across the SaaS network.</p>
        </div>
        
        {isCEO && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-xl h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs">
                <Plus className="w-5 h-5" /> Provision New Node
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-primary p-8 text-white relative">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Building2 className="w-8 h-8 text-secondary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Onboard Institution</DialogTitle>
                    <DialogDescription className="text-white/60">Initialize a new secure pedagogical node.</DialogDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </Button>
              </DialogHeader>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full School Name</Label>
                  <Input 
                    value={newSchoolData.name} 
                    onChange={(e) => setNewSchoolData({...newSchoolData, name: e.target.value})} 
                    className="h-12 bg-accent/30 border-none rounded-xl font-bold" 
                    placeholder="e.g. Government Bilingual High School Deido" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Short Name (Code)</Label>
                    <Input 
                      value={newSchoolData.shortName} 
                      onChange={(e) => setNewSchoolData({...newSchoolData, shortName: e.target.value})} 
                      className="h-12 bg-accent/30 border-none rounded-xl font-black uppercase" 
                      placeholder="e.g. GBHS" 
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Principal Name</Label>
                    <Input 
                      value={newSchoolData.principal} 
                      onChange={(e) => setNewSchoolData({...newSchoolData, principal: e.target.value})} 
                      className="h-12 bg-accent/30 border-none rounded-xl font-bold" 
                      placeholder="e.g. Dr. Jean Dupont" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                    <Input 
                      value={newSchoolData.email} 
                      onChange={(e) => setNewSchoolData({...newSchoolData, email: e.target.value})} 
                      className="h-12 bg-accent/30 border-none rounded-xl pl-10" 
                      placeholder="admin@school.edu.cm" 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-accent/20 p-6 border-t border-accent">
                <Button onClick={handleSaveSchool} className="w-full h-14 rounded-2xl shadow-lg font-black uppercase tracking-widest text-xs gap-3 bg-primary text-white hover:bg-primary/90" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-secondary" />
                      <span>Provision Node & Generate ID</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input placeholder="Search institutions by name, id or domain..." className="border-none bg-transparent focus-visible:ring-0" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSchools.map((school) => (
          <Card key={school.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group bg-white rounded-[2rem]">
            <div className="absolute top-0 right-0 p-4 z-10">
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent">
                     <MoreVertical className="w-5 h-5 text-primary/40"/>
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl p-2 border-none">
                   <DropdownMenuLabel className="text-[9px] uppercase font-black opacity-40 px-3">Node Control</DropdownMenuLabel>
                   <DropdownMenuItem className="gap-3 rounded-xl cursor-pointer" onClick={() => setManagedSchool(school)}>
                     <Settings2 className="w-4 h-4 text-primary/60" /> 
                     <span className="font-bold text-xs">Configuration Suite</span>
                   </DropdownMenuItem>
                   {isCEO && (
                     <>
                       <DropdownMenuItem className="gap-3 rounded-xl cursor-pointer" onClick={() => toggleSchoolStatusMutation.mutateAsync(school.id)}>
                         {school.status === 'Active' ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                         <span className="font-bold text-xs">{school.status === 'Active' ? 'Suspend Node' : 'Activate Node'}</span>
                       </DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem className="text-destructive gap-3 rounded-xl cursor-pointer" onClick={() => deleteSchoolMutation.mutateAsync(school.id)}>
                         <Trash2 className="w-4 h-4" /> 
                         <span className="font-bold text-xs">Decommission Node</span>
                       </DropdownMenuItem>
                     </>
                   )}
                 </DropdownMenuContent>
               </DropdownMenu>
            </div>
            
            <CardHeader className="flex flex-row items-center gap-4 pb-6">
              <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/10 shadow-lg shrink-0">
                <AvatarImage src={school.logo} alt={school.name} className="object-contain p-2 bg-white" />
                <AvatarFallback className="bg-primary text-white font-black text-xl">{school.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <CardTitle className="text-lg font-black text-primary leading-tight uppercase tracking-tighter truncate">{school.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn(
                    "text-[8px] font-black uppercase border-none px-3 h-5",
                    school.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {school.status}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{school.id}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="py-6 border-y border-accent/50 space-y-4 bg-accent/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-lg">
                  <User className="w-4 h-4 text-primary/60" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Principal</p>
                  <p className="text-sm font-bold text-primary">{school.principal}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary/60" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Location</p>
                  <p className="text-sm font-bold text-primary">{school.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-lg">
                  <Mail className="w-4 h-4 text-primary/60" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Official Contact</p>
                  <p className="text-sm font-bold text-secondary italic truncate max-w-[200px]">{school.email}</p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-6 pb-6">
              <Button variant="outline" className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 border-primary/10 text-primary hover:bg-primary/5" onClick={() => setManagedSchool(school)}>
                <ShieldCheck className="w-4 h-4" /> Node Governance
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* NODE CONFIGURATION DIALOG */}
      <Dialog open={!!managedSchool} onOpenChange={() => setManagedSchool(null)}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className={cn("p-10 text-white relative", managedSchool?.status === 'Active' ? "bg-primary" : "bg-destructive/80")}>
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 rounded-[1.5rem] border-4 border-white/20 shadow-xl shrink-0">
                <AvatarImage src={managedSchool?.logo} className="object-contain p-2 bg-white" />
                <AvatarFallback className="bg-white text-primary font-black text-2xl">{managedSchool?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter">{managedSchool?.name}</DialogTitle>
                <p className="opacity-70 font-mono text-sm uppercase tracking-widest mt-1">Verified Node: {managedSchool?.id}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setManagedSchool(null)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
          </DialogHeader>
          <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
            <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 space-y-6">
               <h3 className="font-black text-primary uppercase text-xs tracking-[0.2em] border-b pb-2 opacity-40">Administrative Interventions</h3>
               <div className="grid grid-cols-1 gap-4">
                  {isCEO ? (
                    <>
                      <Button variant="outline" className="w-full justify-between h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white border-primary/10 hover:bg-primary/5 transition-all" onClick={() => { toggleSchoolStatus(managedSchool.id); setManagedSchool(null); }}>
                        License Authorization {managedSchool?.status === 'Active' ? <Ban className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      </Button>
                      <Button variant="destructive" className="w-full justify-between h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg opacity-80 hover:opacity-100 transition-all" onClick={() => { deleteSchool(managedSchool.id); setManagedSchool(null); }}>
                        Permanently Decommission <Trash2 className="w-5 h-5" />
                      </Button>
                    </>
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-primary/10 flex items-center gap-3">
                      <Lock className="w-4 h-4 text-primary/40" />
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Action restricted to the CEO office.</p>
                    </div>
                  )}
               </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 text-center">
               <QrCode className="w-24 h-24 text-primary opacity-10" />
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Institutional Node Certificate</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NODE ACTIVATION RECEIPT (EDUIGNITE OFFICIAL) */}
      <Dialog open={!!onboardingSuccess} onOpenChange={() => setOnboardingSuccess(null)}>
        <DialogContent className="sm:max-w-2xl p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <DialogHeader className="bg-primary p-8 text-white no-print relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl text-secondary">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black">Provisioning Successful</DialogTitle>
                  <DialogDescription className="text-white/60">New institutional node has been activated on the network.</DialogDescription>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOnboardingSuccess(null)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
          </DialogHeader>

          <div className="bg-muted p-6 md:p-10 print:p-0 print:bg-white overflow-y-auto max-h-[70vh]">
            <div id="activation-receipt" className="bg-white p-8 md:p-12 border-2 border-black shadow-sm relative flex flex-col space-y-10 font-serif text-black print:border-none print:shadow-none">
               
               {/* EduIgnite Platform Header */}
               <div className="flex justify-between items-center border-b-4 border-black pb-6">
                  <div className="flex items-center gap-4">
                    <img src={platformSettings.logo} alt="EduIgnite" className="w-16 h-16 object-contain rounded-2xl bg-primary p-2" />
                    <div className="space-y-0.5">
                      <h2 className="font-black text-3xl uppercase tracking-tighter text-primary">{platformSettings.name}</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Digital Education Infrastructure</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline" className="border-black text-black font-black uppercase text-[10px] px-4 py-1">OFFICIAL NODE TICKET</Badge>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{new Date().toLocaleDateString()}</p>
                  </div>
               </div>

               <div className="space-y-8 text-center py-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tight">Institutional Node Activation</h3>
                    <p className="text-sm font-medium italic opacity-60">This official document confirms the successful registration of:</p>
                  </div>

                  <div className="p-8 bg-accent/10 border-2 border-dashed border-black/20 rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Globe className="w-24 h-24" /></div>
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-20 w-20 rounded-2xl border-2 border-black/10 shadow-lg">
                        <AvatarImage src={onboardingSuccess?.logo} className="object-contain p-2 bg-white" />
                        <AvatarFallback className="text-2xl font-black">{onboardingSuccess?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h2 className="text-2xl font-black text-primary uppercase leading-tight">{onboardingSuccess?.name}</h2>
                      <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground mt-1">
                        <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {onboardingSuccess?.principal}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {onboardingSuccess?.email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 mt-8">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Provisioned Institutional ID (Matricule)</p>
                       <div className="bg-primary text-secondary px-8 py-4 rounded-2xl shadow-xl">
                          <p className="text-4xl font-mono font-black tracking-tighter leading-none">{onboardingSuccess?.id}</p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-black/10 pt-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="w-5 h-5 text-primary" />
                       <h4 className="text-xs font-black uppercase tracking-widest">Platform Integrity Notice</h4>
                    </div>
                    <p className="text-[11px] leading-relaxed font-medium text-muted-foreground">
                      "This matricule is the unique identifier for your institutional node. It must be provided to the school administrator to activate the secure dashboard and initialize the pedagogical registry."
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="p-2 bg-white border-2 border-black rounded-xl shadow-inner">
                      <QrCode className="w-24 h-24 text-black" />
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Encrypted Registry Node</p>
                  </div>
               </div>

               <div className="pt-8 border-t-2 border-black/5 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em]">Verified by</p>
                    <p className="font-black text-sm uppercase tracking-tighter">The Office of the CEO</p>
                    <img src={platformSettings.logo} alt="EduIgnite" className="w-6 h-6 grayscale opacity-20" />
                  </div>
                  <div className="text-center space-y-4 w-40">
                    <div className="h-12 w-full mx-auto relative flex items-center justify-center">
                       <SignatureSVG className="w-full h-full text-primary/10 p-2" />
                    </div>
                    <p className="text-[9px] font-black uppercase text-primary border-t border-black/20 pt-1">Platform Registrar</p>
                  </div>
               </div>

               <div className="text-center pt-6 border-t border-black/5">
                  <div className="flex items-center justify-center gap-3">
                    <img src={platformSettings.logo} alt="SaaS" className="w-4 h-4 object-contain opacity-20" />
                    <p className="text-[8px] font-black uppercase text-muted-foreground opacity-30 tracking-[0.4em]">
                      Verified Employment Record • Secure Registry Node • {new Date().getFullYear()}
                    </p>
                  </div>
               </div>
            </div>
          </div>

          <DialogFooter className="bg-accent/10 p-8 border-t no-print flex flex-col sm:flex-row gap-4 shrink-0">
            <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs" onClick={() => setOnboardingSuccess(null)}>
              Return to Registry
            </Button>
            <div className="flex flex-1 gap-2">
              <Button 
                variant="secondary" 
                className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs gap-2"
                onClick={() => toast({ title: "Receipt Downloaded" })}
              >
                <Download className="w-4 h-4" /> Download PDF
              </Button>
              <Button 
                className="flex-1 rounded-2xl h-14 shadow-2xl font-black uppercase tracking-widest text-xs gap-2 bg-primary text-white" 
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" /> Print Ticket
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
