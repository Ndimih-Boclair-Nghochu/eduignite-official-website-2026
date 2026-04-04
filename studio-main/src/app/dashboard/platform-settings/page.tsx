"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { usePlatformSettings, usePlatformFees, usePublicEvents, usePlatformStats, useUpdatePlatformSettings, useCreatePublicEvent, useDeletePublicEvent, useClearDemoData } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings2,
  Save,
  Loader2,
  Coins,
  ShieldCheck,
  Globe,
  Plus,
  Trash2,
  Star,
  X,
  Upload,
  Calendar,
  Layout,
  Users,
  Building2,
  Lock,
  Wallet,
  Smartphone,
  Heart,
  BookOpen,
  Video,
  Image as ImageIcon,
  GraduationCap,
  Link as LinkIcon,
  PlayCircle,
  Info,
  AlertTriangle,
  Database,
  ServerCrash,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading: settingsLoading } = usePlatformSettings();
  const { data: feesResponse } = usePlatformFees();
  const { data: eventsResponse } = usePublicEvents();
  const { data: stats } = usePlatformStats();

  const updateMutation = useUpdatePlatformSettings();
  const createEventMutation = useCreatePublicEvent();
  const deleteEventMutation = useDeletePublicEvent();
  const clearDemoMutation = useClearDemoData();

  const fees = feesResponse?.results ?? [];
  const events = eventsResponse?.results ?? [];

  const [showClearDemoDialog, setShowClearDemoDialog] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  const [formData, setFormData] = useState({
    platformName: "",
    platformLogo: "",
    paymentDeadline: "",
    honourRollThreshold: 0,
    maintenanceMode: false
  });

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    url: "",
    type: "video" as "video" | "image"
  });

  const isDesigner = user?.role === "DESIGNER";
  const isSuperUser = user?.role === "SUPER_ADMIN" || user?.role === "CEO" || user?.role === "CTO" || user?.role === "COO";
  const isOwner = user?.role === "SUPER_ADMIN" || user?.role === "CEO";

  const handleClearDemoData = () => {
    clearDemoMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        setShowClearDemoDialog(false);
        setClearConfirmText("");
        toast({
          title: "Demo Data Cleared",
          description: data?.message || "All demo data has been permanently removed from the system.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to Clear Demo Data",
          description: error?.response?.data?.message || "An error occurred while clearing demo data.",
          variant: "destructive",
        });
      },
    });
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        platformName: settings.name || "",
        platformLogo: settings.logo || "",
        paymentDeadline: settings.payment_deadline || "",
        honourRollThreshold: settings.honour_roll_threshold || 0,
        maintenanceMode: settings.maintenance_mode || false
      });
    }
  }, [settings]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Please select an image smaller than 2MB." });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, platformLogo: reader.result as string }));
        toast({ title: "Logo Processed", description: "Identity preview updated locally." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSettings = () => {
    if (!isSuperUser) return;

    updateMutation.mutate({
      name: formData.platformName,
      logo: formData.platformLogo,
      payment_deadline: formData.paymentDeadline,
      honour_roll_threshold: formData.honourRollThreshold,
      maintenance_mode: formData.maintenanceMode
    }, {
      onSuccess: () => {
        toast({
          title: "Platform Policy Updated",
          description: "All branding, financial, and training parameters have been synchronized."
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to update settings",
          variant: "destructive"
        });
      }
    });
  };

  const handlePublishEvent = () => {
    if (!newEvent.title || !newEvent.url) {
      toast({ variant: "destructive", title: "Missing Information", description: "Title and media URL are required." });
      return;
    }

    createEventMutation.mutate({
      type: newEvent.type,
      title: newEvent.title,
      description: newEvent.description,
      url: newEvent.url
    }, {
      onSuccess: () => {
        setNewEvent({ title: "", description: "", url: "", type: "video" });
        toast({ title: "Portfolio Updated", description: "New content added to community portal." });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to add event",
          variant: "destructive"
        });
      }
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEventMutation.mutate(eventId, {
      onSuccess: () => {
        toast({ title: "Event Removed", description: "Portfolio content has been deleted." });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to delete event",
          variant: "destructive"
        });
      }
    });
  };

  const FeeInput = ({ id, label, value, icon: Icon, colorClass }: any) => {
    const feeRecord = fees.find(f => f.role === id);
    return (
      <div className="space-y-3 p-4 rounded-2xl bg-accent/30 border border-accent hover:border-primary/20 transition-all">
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Icon className={cn("w-3.5 h-3.5", colorClass)} />
            {label}
          </Label>
          <Badge variant="outline" className="text-[10px] font-bold border-primary/10 text-primary">ANNUAL LICENSE</Badge>
        </div>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">
            {feeRecord?.currency || "XAF"}
          </div>
          <Input
            id={id}
            type="number"
            value={feeRecord?.amount || ""}
            disabled
            className="bg-white border-none h-12 pl-12 rounded-xl focus-visible:ring-primary font-black text-lg shadow-sm text-primary"
          />
        </div>
      </div>
    );
  };

  const TrainingLinkInput = ({ id, label, icon: Icon }: any) => {
    const link = settings?.tutorial_links?.[id as keyof typeof settings.tutorial_links] || "";
    return (
      <div className="space-y-3 p-4 rounded-2xl bg-accent/30 border border-accent">
        <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-primary" />
          {label} Link
        </Label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
          <Input
            id={id}
            value={link}
            disabled
            placeholder="https://youtube.com/..."
            className="bg-white border-none h-11 pl-10 rounded-xl focus-visible:ring-primary text-xs font-bold"
          />
        </div>
      </div>
    );
  };

  if (settingsLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              {isDesigner ? <Star className="w-6 h-6 text-secondary" /> : <Settings2 className="w-6 h-6 text-secondary" />}
            </div>
            {isDesigner ? "Creative Portfolio Suite" : t("platformSettings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isDesigner
              ? "Manage public institutional highlights and marketing media."
              : "Govern global SaaS identity, revenue models, and educational content."}
          </p>
        </div>
        {isSuperUser && (
          <Button onClick={handleUpdateSettings} disabled={updateMutation.isPending} className="h-14 px-10 shadow-2xl font-black uppercase tracking-widest text-xs gap-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all">
            {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Commit Global Policy
          </Button>
        )}
      </div>

      <Tabs defaultValue={isDesigner ? "marketing" : "branding"} className="w-full">
        <TabsList className={cn(
          "grid w-full mb-10 bg-white shadow-sm border h-auto p-1.5 rounded-3xl",
          isDesigner ? "grid-cols-1 md:w-[300px]" : isOwner ? "grid-cols-5 md:w-full" : "grid-cols-4 md:w-[900px]"
        )}>
          {!isDesigner && (
            <>
              <TabsTrigger value="branding" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
                <Layout className="w-4 h-4" /> <span className="hidden sm:inline">Identity</span>
              </TabsTrigger>
              <TabsTrigger value="revenue" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
                <Coins className="w-4 h-4" /> <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
                <PlayCircle className="w-4 h-4" /> <span className="hidden sm:inline">Training</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="marketing" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
            <Star className="w-4 h-4" /> <span className="hidden sm:inline">Portfolio</span>
          </TabsTrigger>
          {isOwner && !isDesigner && (
            <TabsTrigger value="system" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm text-destructive data-[state=active]:bg-destructive data-[state=active]:text-white">
              <ServerCrash className="w-4 h-4" /> <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          )}
        </TabsList>

        {!isDesigner && (
          <>
            <TabsContent value="branding" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-primary p-10 text-white">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <Globe className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tighter">Strategic Branding</CardTitle>
                      <CardDescription className="text-white/60">Customize the visual identity of the SaaS platform.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
                    <div className="md:col-span-4 space-y-4 text-center">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block">Platform Logo</Label>
                      <div
                        className={cn(
                          "group relative w-48 h-48 mx-auto bg-accent/20 rounded-[2.5rem] border-2 border-dashed border-accent flex items-center justify-center overflow-hidden transition-all shadow-inner",
                          isSuperUser ? "cursor-pointer hover:border-primary" : "cursor-default"
                        )}
                        onClick={() => isSuperUser && logoInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={logoInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                        {formData.platformLogo ? (
                          <img src={formData.platformLogo} alt="Logo" className="w-full h-full object-contain p-6" />
                        ) : (
                          <Upload className="w-10 h-10 text-primary/20" />
                        )}
                        {isSuperUser && (
                          <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 backdrop-blur-sm">
                            <Upload className="w-8 h-8" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Change Device Logo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Platform Market Name</Label>
                        <Input
                          value={formData.platformName}
                          onChange={(e) => setFormData({...formData, platformName: e.target.value})}
                          placeholder="e.g. EduIgnite"
                          className="h-14 bg-accent/30 border-none rounded-2xl font-black text-2xl text-primary focus-visible:ring-primary px-6"
                          disabled={!isSuperUser}
                        />
                      </div>

                      <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center gap-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                          <ShieldCheck className="w-6 h-6 text-secondary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-primary uppercase tracking-tight leading-none">Global Sync Enabled</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Identity changes are cached and distributed to all institutional nodes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                  <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem]">
                    <CardHeader className="bg-primary/5 border-b p-10">
                      <CardTitle className="text-2xl font-black text-primary flex items-center gap-3">
                        <Coins className="w-6 h-6 text-secondary" />
                        Annual License Structures
                      </CardTitle>
                      <CardDescription>View the platform access fees for non-executive roles.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FeeInput id="STUDENT" label="Student Access" icon={GraduationCap} colorClass="text-blue-600" />
                        <FeeInput id="TEACHER" label="Teacher Licensing" icon={Users} colorClass="text-purple-600" />
                        <FeeInput id="PARENT" label="Family Portal" icon={Heart} colorClass="text-rose-600" />
                        <FeeInput id="BURSAR" label="Financial Node" icon={Wallet} colorClass="text-emerald-600" />
                        <FeeInput id="LIBRARIAN" label="Library Node" icon={BookOpen} colorClass="text-amber-600" />
                        <FeeInput id="SCHOOL_ADMIN" label="Primary Admin" icon={Building2} colorClass="text-red-600" />
                        <FeeInput id="SUB_ADMIN" label="Sub-Admin Node" icon={ShieldCheck} colorClass="text-cyan-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-primary text-white">
                    <CardHeader className="bg-white/10 p-8 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-secondary" />
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Global Deadline</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/60 tracking-widest">Final Payment Date</Label>
                        <Input
                          type="date"
                          value={formData.paymentDeadline}
                          onChange={(e) => setFormData({...formData, paymentDeadline: e.target.value})}
                          className="h-14 bg-white/10 border-white/20 text-white font-black text-xl rounded-2xl px-6 focus-visible:ring-secondary"
                          disabled={!isSuperUser}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="training" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <Card className="border-none shadow-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-primary p-10 text-white">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <PlayCircle className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tighter">User Training Repository</CardTitle>
                      <CardDescription className="text-white/60">View the educational links found in the "Learn to use your Dashboard" button for each user role.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <TrainingLinkInput id="STUDENT" label="Student" icon={GraduationCap} />
                    <TrainingLinkInput id="TEACHER" label="Teacher" icon={Users} />
                    <TrainingLinkInput id="PARENT" label="Parent" icon={Heart} />
                    <TrainingLinkInput id="SCHOOL_ADMIN" label="School Admin" icon={Building2} />
                    <TrainingLinkInput id="SUB_ADMIN" label="Sub-Admin" icon={ShieldCheck} />
                    <TrainingLinkInput id="BURSAR" label="Bursar" icon={Wallet} />
                    <TrainingLinkInput id="LIBRARIAN" label="Librarian" icon={BookOpen} />
                  </div>
                </CardContent>
                <CardFooter className="bg-accent/10 p-6 border-t flex items-center gap-3">
                   <Info className="w-5 h-5 text-primary opacity-40" />
                   <p className="text-[10px] text-muted-foreground italic">These links are dynamically loaded into the global footer for all authorized users in the network.</p>
                </CardFooter>
              </Card>
            </TabsContent>
          </>
        )}

        <TabsContent value="marketing" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary p-10 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Star className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter">Public Portfolio Management</CardTitle>
                  <CardDescription className="text-white/60">Add institutional content via external URLs to the community highlights.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              {(isSuperUser || isDesigner) && (
                <div className="p-8 bg-accent/30 rounded-[2rem] border border-accent space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-4 space-y-4 flex flex-col">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Content Type</Label>
                      <div className="flex gap-2 w-full">
                        <Button
                          variant={newEvent.type === 'video' ? 'default' : 'outline'}
                          className="flex-1 rounded-xl h-12 font-bold gap-2"
                          onClick={() => setNewEvent({...newEvent, type: 'video', url: ''})}
                        >
                          <Video className="w-4 h-4" /> Video
                        </Button>
                        <Button
                          variant={newEvent.type === 'image' ? 'default' : 'outline'}
                          className="flex-1 rounded-xl h-12 font-bold gap-2"
                          onClick={() => setNewEvent({...newEvent, type: 'image', url: ''})}
                        >
                          <ImageIcon className="w-4 h-4" /> Image
                        </Button>
                      </div>

                      <div className="w-full aspect-video bg-white rounded-2xl border-2 border-dashed border-primary/10 flex items-center justify-center overflow-hidden shadow-inner mt-2">
                        {newEvent.url ? (
                          newEvent.type === 'video' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-2">
                              <Video className="w-8 h-8 opacity-20" />
                              <span className="text-[8px] font-black uppercase opacity-40">External Video URL</span>
                            </div>
                          ) : (
                            <img src={newEvent.url} alt="Preview" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="text-center space-y-2">
                            <LinkIcon className="w-6 h-6 text-primary/20 mx-auto" />
                            <span className="text-[9px] font-black uppercase text-primary/20 block">Media Preview</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Headline Title</Label>
                        <Input
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                          placeholder="e.g. Annual Pedagogical Summit"
                          className="h-12 border-none bg-white rounded-xl px-4 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Short Summary</Label>
                        <Input
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                          placeholder="Capturing the moments..."
                          className="h-12 border-none bg-white rounded-xl px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
                          {newEvent.type === 'video' ? 'YouTube / Video Embed URL' : 'Direct Image URL'}
                        </Label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                          <Input
                            value={newEvent.url}
                            onChange={(e) => setNewEvent({...newEvent, url: e.target.value})}
                            placeholder="https://..."
                            className="h-12 border-none bg-white rounded-xl pl-10 pr-4"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handlePublishEvent} disabled={createEventMutation.isPending} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 rounded-2xl shadow-xl transition-all">
                    {createEventMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 text-secondary" />}
                    Add to Public Portfolio
                  </Button>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase text-primary tracking-[0.3em] border-b pb-2 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Active Gallery Contents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <Card key={event.id} className="border-none shadow-sm overflow-hidden bg-accent/10 flex flex-col group">
                      <div className="aspect-video relative bg-slate-900 overflow-hidden">
                        {event.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <iframe
                              src={event.url}
                              className="w-full h-full pointer-events-none"
                              title={event.title}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center font-bold text-white uppercase text-[10px]">VIDEO CONTENT</div>
                          </div>
                        ) : (
                          <img src={event.url} alt={event.title} className="w-full h-full object-cover" />
                        )}
                        {(isSuperUser || isDesigner) && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deleteEventMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <CardTitle className="text-base font-black truncate">{event.title}</CardTitle>
                          <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/10">{event.type}</Badge>
                        </div>
                        <CardDescription className="text-xs line-clamp-1">{event.description}</CardDescription>
                      </CardHeader>
                      {(isSuperUser || isDesigner) && (
                        <CardFooter className="p-4 pt-0 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive gap-2 text-[10px] font-black uppercase"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deleteEventMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {isOwner && !isDesigner && (
          <TabsContent value="system" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {/* Danger Zone Card */}
            <Card className="border-2 border-destructive/30 shadow-xl overflow-hidden rounded-[2.5rem]">
              <CardHeader className="bg-destructive/5 p-8 sm:p-10 border-b border-destructive/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-2xl">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter text-destructive">Danger Zone</CardTitle>
                    <CardDescription className="text-destructive/60">Irreversible system operations. Proceed with extreme caution.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 sm:p-10 space-y-8">
                {/* Clear Demo Data Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 bg-destructive/5 rounded-2xl border border-destructive/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl border border-destructive/20 shrink-0">
                      <Database className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-base text-destructive uppercase tracking-tight">Clear Demo Data</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                        Permanently removes all seeded demo schools, users, students, grades, attendance records, and related data from the system. This action <strong>cannot be undone</strong>.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {["Demo School", "15 Demo Users", "Sample Students", "Test Grades", "Mock Payments", "Demo Live Classes"].map(item => (
                          <Badge key={item} variant="outline" className="text-[10px] font-bold border-destructive/20 text-destructive/70">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="shrink-0 h-12 px-8 font-black uppercase tracking-widest text-xs gap-3 rounded-2xl"
                    onClick={() => setShowClearDemoDialog(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Demo Data
                  </Button>
                </div>

                {/* System Stats Preview */}
                <div className="p-6 bg-accent/30 rounded-2xl border border-accent space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" /> Current System Snapshot
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Total Schools", value: stats?.total_schools ?? "—", color: "text-primary" },
                      { label: "Active Schools", value: stats?.active_schools ?? "—", color: "text-emerald-600" },
                      { label: "Total Users", value: stats?.total_users ?? "—", color: "text-blue-600" },
                      { label: "Total Students", value: stats?.total_students ?? "—", color: "text-purple-600" },
                    ].map(stat => (
                      <div key={stat.label} className="text-center p-4 bg-white rounded-xl border border-accent">
                        <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Clear Demo Data Confirmation Dialog */}
      <Dialog open={showClearDemoDialog} onOpenChange={(open) => { setShowClearDemoDialog(open); if (!open) setClearConfirmText(""); }}>
        <DialogContent className="sm:max-w-md rounded-3xl border-destructive/30">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <DialogTitle className="text-destructive font-black uppercase tracking-tight text-xl">Confirm Demo Data Removal</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete <strong>all demo schools, users, students, grades, attendance records, payments, and live class data</strong> from the database. This action is <strong>irreversible</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/20 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-destructive">What will be deleted:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2"><Trash2 className="w-3 h-3 text-destructive" /> Demo school and all school-specific records</li>
                <li className="flex items-center gap-2"><Trash2 className="w-3 h-3 text-destructive" /> All 15 demo user accounts</li>
                <li className="flex items-center gap-2"><Trash2 className="w-3 h-3 text-destructive" /> Students, grades, attendance, fees, library loans</li>
                <li className="flex items-center gap-2"><Trash2 className="w-3 h-3 text-destructive" /> Demo live classes and enrollments</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Type <span className="text-destructive font-black">CLEAR DEMO</span> to confirm
              </Label>
              <Input
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="CLEAR DEMO"
                className="h-12 border-destructive/30 focus-visible:ring-destructive rounded-xl font-black tracking-wider"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-2">
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => { setShowClearDemoDialog(false); setClearConfirmText(""); }}
              disabled={clearDemoMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black uppercase tracking-widest text-xs gap-2"
              onClick={handleClearDemoData}
              disabled={clearConfirmText !== "CLEAR DEMO" || clearDemoMutation.isPending}
            >
              {clearDemoMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Clearing...</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Permanently Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
