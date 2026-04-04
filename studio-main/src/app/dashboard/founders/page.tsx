
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useExecutives } from "@/lib/hooks/useUsers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  UserPlus, 
  Crown, 
  ShieldCheck, 
  Mail, 
  Trash2, 
  Plus, 
  Fingerprint,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Save,
  X,
  Globe,
  TrendingUp,
  Activity,
  Zap,
  History,
  Building2,
  Sparkles,
  Coins,
  MoreVertical,
  Pencil,
  Ban,
  Smartphone,
  PieChart
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MOCK_FOUNDERS = [
  { id: "EduI24CEO001", name: "EduIgnite Founder", email: "ceo@eduignite.io", contact: "+237 600 00 00 01", shares: "40%", role: "CEO", status: "Active", isPrimary: true, avatar: "https://picsum.photos/seed/ceo/150/150", permissions: { manageSchools: true, manageTeam: true, viewAnalytics: true, manageSupport: true } },
  { id: "EduI24CTO001", name: "Tech Director", email: "cto@eduignite.io", contact: "+237 600 00 00 02", shares: "15%", role: "CTO", status: "Active", isPrimary: false, avatar: "https://picsum.photos/seed/cto/150/150", permissions: { manageSchools: true, manageTeam: false, viewAnalytics: true, manageSupport: false } },
  { id: "EduI24COO001", name: "Operations Lead", email: "coo@eduignite.io", contact: "+237 600 00 00 03", shares: "15%", role: "COO", status: "Active", isPrimary: false, avatar: "https://picsum.photos/seed/coo/150/150", permissions: { manageSchools: true, manageTeam: false, viewAnalytics: false, manageSupport: true } },
];

const EXECUTIVE_LOGS = [
  { actor: "CEO", action: "Updated Global Pricing Policy", time: "Today, 08:45 AM", impact: "Strategic", icon: Crown, color: "text-primary" },
  { actor: "CTO", action: "Authorized High-Availability Node Sync", time: "Yesterday", impact: "System", icon: Zap, color: "text-indigo-600" },
  { actor: "COO", action: "Provisioned 4 New Institutional Nodes", time: "Yesterday", impact: "Operational", icon: Building2, color: "text-blue-600" },
  { actor: "Designer", action: "Updated Public Portfolio Media", time: "2 days ago", impact: "Marketing", icon: Sparkles, color: "text-cyan-600" },
  { actor: "Investor", action: "Accessed Quarterly Revenue Audit", time: "3 days ago", impact: "Financial", icon: Coins, color: "text-emerald-600" },
];

export default function FoundersManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [founders, setFounders] = useState<any[]>([]);
  const [editingFounder, setEditingFounder] = useState<any>(null);
  
  const [newFounderData, setNewFounderData] = useState({
    name: "",
    email: "",
    contact: "",
    shares: "",
    role: "COO",
    permissions: { manageSchools: false, manageTeam: false, viewAnalytics: true, manageSupport: false }
  });

  const isCEO = user?.role === "CEO" || user?.role === "SUPER_ADMIN";

  // Fetch real executive users from API (CEO, CTO, COO, INV, DESIGNER)
  const { data: executivesData, isLoading: executivesLoading } = useExecutives();

  useEffect(() => {
    if (executivesData?.results?.length) {
      const mapped = executivesData.results.map((u: any) => ({
        id: u.matricule,
        name: u.name,
        email: u.email,
        contact: u.phone || u.whatsapp || '',
        shares: '—',
        role: u.role,
        avatar: u.avatar,
        permissions: {
          manageSchools: ['CEO', 'COO', 'SUPER_ADMIN'].includes(u.role),
          manageTeam: ['CEO', 'CTO', 'SUPER_ADMIN'].includes(u.role),
          viewAnalytics: true,
          manageSupport: ['CEO', 'COO', 'SUPER_ADMIN'].includes(u.role),
        },
      }));
      setFounders(mapped.length > 0 ? mapped : MOCK_FOUNDERS);
    } else if (!executivesLoading) {
      setFounders(MOCK_FOUNDERS);
    }
    setIsLoading(executivesLoading);
  }, [executivesData, executivesLoading]);

  const handleAddFounder = async () => {
    if (!isCEO || !newFounderData.name || !newFounderData.email) return;
    setIsProcessing(true);
    setTimeout(() => {
      const year = new Date().getFullYear().toString().slice(-2);
      const roleCode = newFounderData.role.substring(0, 3).toUpperCase();
      const generatedId = `EduI${year}${roleCode}${Math.floor(100 + Math.random() * 899)}`;
      const created = { 
        ...newFounderData, 
        id: generatedId, 
        status: "Active", 
        avatar: `https://picsum.photos/seed/${generatedId}/150/150` 
      };
      setFounders([created, ...founders]);
      setIsProcessing(false);
      setIsAddModalOpen(false);
      setNewFounderData({ 
        name: "", 
        email: "", 
        contact: "", 
        shares: "", 
        role: "COO", 
        permissions: { manageSchools: false, manageTeam: false, viewAnalytics: true, manageSupport: false } 
      });
      toast({ title: "Executive Onboarded", description: `${created.name} is now part of the board.` });
    }, 1200);
  };

  const handleUpdateFounder = () => {
    if (!editingFounder) return;
    setIsProcessing(true);
    setTimeout(() => {
      setFounders(prev => prev.map(f => f.id === editingFounder.id ? editingFounder : f));
      setIsProcessing(false);
      setEditingFounder(null);
      toast({ title: "Board Record Updated" });
    }, 800);
  };

  const handleDeleteFounder = (id: string) => {
    setFounders(prev => prev.filter(f => f.id !== id));
    toast({ variant: "destructive", title: "Founder Removed", description: "The executive record has been decommissioned." });
  };

  const handleToggleStatus = (id: string) => {
    setFounders(prev => prev.map(f => {
      if (f.id === id) {
        const nextStatus = f.status === "Active" ? "Suspended" : "Active";
        toast({ title: `Founder ${nextStatus}` });
        return { ...f, status: nextStatus };
      }
      return f;
    }));
  };

  const PermissionToggle = ({ label, description, checked, onChange, icon: Icon, disabled }: any) => (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-2xl border-2 transition-all", 
      !disabled ? "cursor-pointer" : "cursor-default opacity-60",
      checked ? "border-primary bg-primary/5 shadow-sm" : "border-accent bg-white"
    )} onClick={() => !disabled && onChange(!checked)}>
      <div className="pt-0.5"><Checkbox checked={checked} onCheckedChange={() => {}} disabled={disabled} className="pointer-events-none" /></div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2"><Icon className={cn("w-4 h-4", checked ? "text-primary" : "text-muted-foreground")} /><span className="font-black text-sm uppercase tracking-tight">{label}</span></div>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg text-white"><Crown className="w-6 h-6 text-secondary" /></div>
            Board Governance
          </h1>
          <p className="text-muted-foreground mt-1">Strategic oversight and global authority management.</p>
        </div>
        {isCEO && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-xl h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs">
                <UserPlus className="w-5 h-5" /> Onboard Executive
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-primary p-10 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck className="w-8 h-8 text-secondary" /></div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase">Issue Authority</DialogTitle>
                    <DialogDescription className="text-white/60">Initialize new board member registry with professional and equity details.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-10 space-y-8 bg-white max-h-[60vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Identity Name</Label>
                    <Input value={newFounderData.name || ""} onChange={(e) => setNewFounderData({...newFounderData, name: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl font-bold" placeholder="Full Legal Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Professional Email</Label>
                    <Input type="email" value={newFounderData.email || ""} onChange={(e) => setNewFounderData({...newFounderData, email: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl" placeholder="executive@eduignite.io" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Contact Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input value={newFounderData.contact || ""} onChange={(e) => setNewFounderData({...newFounderData, contact: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl pl-10 font-bold" placeholder="+237 ..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Shares / Equity</Label>
                    <div className="relative">
                      <PieChart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input value={newFounderData.shares || ""} onChange={(e) => setNewFounderData({...newFounderData, shares: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl pl-10 font-black" placeholder="e.g. 10% or 5000" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Strategic Board Role</Label>
                    <Select value={newFounderData.role || "COO"} onValueChange={(v) => setNewFounderData({...newFounderData, role: v})}>
                      <SelectTrigger className="h-12 bg-accent/30 border-none rounded-xl font-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="CEO">Chief Executive Officer (CEO)</SelectItem>
                        <SelectItem value="CTO">Chief Technology Officer (CTO)</SelectItem>
                        <SelectItem value="COO">Chief Operations Officer (COO)</SelectItem>
                        <SelectItem value="INV">Strategic Investor (INV)</SelectItem>
                        <SelectItem value="DESIGNER">Creative Lead (Designer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Authority Parameters</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PermissionToggle label="Nodes" description="Provision institutional clusters." icon={Globe} checked={newFounderData.permissions.manageSchools} onChange={(v: boolean) => setNewFounderData({...newFounderData, permissions: {...newFounderData.permissions, manageSchools: v}})} />
                    <PermissionToggle label="Finance" description="Audit global revenue velocity." icon={TrendingUp} checked={newFounderData.permissions.viewAnalytics} onChange={(v: boolean) => setNewFounderData({...newFounderData, permissions: {...newFounderData.permissions, viewAnalytics: v}})} />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-accent/20 p-8 border-t">
                <Button className="w-full h-16 rounded-2xl shadow-xl font-black uppercase text-sm" onClick={handleAddFounder} disabled={isProcessing || !newFounderData.name}>
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Board Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {founders.map((founder) => (
          <Card key={founder.id} className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] group hover:shadow-2xl transition-all duration-500">
            <CardHeader className={cn(
              "p-8 text-white text-center pb-12 relative transition-colors duration-500",
              founder.status === "Active" ? "bg-primary" : "bg-destructive/80"
            )}>
              {isCEO && (
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white/40 hover:text-white hover:bg-white/10">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-2xl border-none p-2">
                      <DropdownMenuLabel className="text-[9px] uppercase font-black opacity-40 px-3">Governance Actions</DropdownMenuLabel>
                      <DropdownMenuItem className="gap-3 rounded-xl cursor-pointer" onClick={() => setEditingFounder({...founder})}>
                        <Pencil className="w-4 h-4 text-primary/60" /> <span className="font-bold text-xs">Edit Identity</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-3 rounded-xl cursor-pointer" onClick={() => handleToggleStatus(founder.id)}>
                        {founder.status === "Active" ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        <span className="font-bold text-xs">{founder.status === "Active" ? "Suspend Access" : "Restore Access"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-accent" />
                      <DropdownMenuItem className="text-destructive gap-3 rounded-xl cursor-pointer" onClick={() => handleDeleteFounder(founder.id)}>
                        <Trash2 className="w-4 h-4" /> <span className="font-bold text-xs">Decommission</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              <Avatar className="h-28 w-28 border-4 border-white/20 mx-auto shadow-2xl mb-6 group-hover:scale-105 transition-transform duration-500">
                <AvatarImage src={founder.avatar} />
                <AvatarFallback className="bg-white text-primary font-black text-2xl">{founder.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl font-black uppercase tracking-tight">{founder.name}</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-white/10 text-white border-none uppercase text-[8px] px-4 py-1">{founder.role}</Badge>
                <Badge className={cn(
                  "border-none text-[8px] font-black uppercase px-3",
                  founder.status === "Active" ? "bg-secondary text-primary" : "bg-white text-destructive"
                )}>
                  {founder.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 -mt-8 bg-white rounded-t-[2.5rem] space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ownership</p>
                  <div className="flex items-center gap-2">
                    <PieChart className="w-3.5 h-3.5 text-primary/40" />
                    <p className="text-base font-black text-primary">{founder.shares || "---"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Matricule</p>
                  <p className="text-sm font-mono font-bold text-primary/60 truncate">{founder.id}</p>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-accent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary/60"><Mail className="w-4 h-4" /></div>
                  <p className="text-xs font-bold text-primary/80 truncate">{founder.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary/60"><Smartphone className="w-4 h-4" /></div>
                  <p className="text-xs font-bold text-primary/80">{founder.contact || "No Contact"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* EDIT FOUNDER DIALOG */}
      <Dialog open={!!editingFounder} onOpenChange={() => setEditingFounder(null)}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-8 text-white relative">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl"><Pencil className="w-8 h-8 text-secondary" /></div>
              <DialogTitle className="text-2xl font-black uppercase">Modify Board Record</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditingFounder(null)} className="absolute top-4 right-4 text-white hover:bg-white/10"><X className="w-6 h-6" /></Button>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase ml-1">Executive Identity</Label>
                <Input value={editingFounder?.name || ""} onChange={(e) => setEditingFounder({...editingFounder, name: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase ml-1">Contact</Label>
                <Input value={editingFounder?.contact || ""} onChange={(e) => setEditingFounder({...editingFounder, contact: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase ml-1">Equity</Label>
                <Input value={editingFounder?.shares || ""} onChange={(e) => setEditingFounder({...editingFounder, shares: e.target.value})} className="h-12 bg-accent/30 border-none rounded-xl font-black" />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-accent/20 p-6 border-t">
            <Button onClick={handleUpdateFounder} className="w-full h-14 rounded-2xl shadow-xl font-bold uppercase text-xs" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Commit Identity Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-white border-b p-8">
          <CardTitle className="text-xl font-black text-primary uppercase flex items-center gap-2">
            <History className="w-6 h-6 text-secondary" /> Board Activity Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {EXECUTIVE_LOGS.map((log, i) => (
                <TableRow key={i} className="hover:bg-primary/5 transition-colors border-b last:border-0">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2.5 rounded-xl shadow-sm bg-white border", log.color.replace('text', 'border'))}>
                        <log.icon className={cn("w-5 h-5", log.color)} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-primary uppercase">{log.action}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">Actor: {log.actor}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Badge variant="secondary" className="bg-secondary/20 text-primary border-none text-[8px] font-black uppercase">{log.impact}</Badge>
                    <p className="text-[9px] text-muted-foreground mt-1 font-bold italic">{log.time}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
