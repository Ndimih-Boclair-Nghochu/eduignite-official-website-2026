"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  Megaphone,
  Send,
  Globe,
  Building2,
  Clock,
  Trash2,
  User,
  Users,
  GraduationCap,
  ShieldCheck,
  Loader2,
  Crown,
  Briefcase,
  Heart,
  ShieldAlert,
  Zap,
  MessageCircle,
  Star,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const [isSending, setIsSending] = useState(false);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isPlatformExecutive = ["CEO", "CTO", "COO", "INV", "DESIGNER", "SUPER_ADMIN"].includes(user?.role || "");
  const isCEO = user?.role === "CEO" || user?.role === "SUPER_ADMIN";
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const isTeacher = user?.role === "TEACHER";

  const initialTarget = isCEO ? "all_schools" : isPlatformExecutive ? "saas_admins" : "everyone";
  const [formData, setFormData] = useState({ title: "", content: "", target: initialTarget });

  const canPost = isPlatformExecutive || isSchoolAdmin || isTeacher;

  // Load announcements
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setHasError(false);
        const response = await fetch("/api/announcements");
        if (!response.ok) throw new Error("Failed to load announcements");
        const data = await response.json();
        setAnnouncements(data.announcements || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error("Error loading announcements:", error);
        setHasError(true);
        toast({ title: "Error", description: "Failed to load announcements", variant: "destructive" });
      } finally {
        setIsLoadingAnnouncements(false);
      }
    };

    loadAnnouncements();
  }, [toast]);

  const handleSend = async () => {
    if (!formData.title || !formData.content || !user) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          target: formData.target,
          senderUid: user.uid,
          senderName: user.name,
          senderRole: user.role,
          senderAvatar: user.avatar || ""
        })
      });

      if (!response.ok) throw new Error("Failed to send announcement");

      const data = await response.json();
      setAnnouncements([data.announcement, ...announcements]);
      toast({
        title: "Announcement Published",
        description: `The message has been broadcasted to ${formData.target.replace("_", " ")}.`
      });
      setFormData({ title: "", content: "", target: initialTarget });
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast({ title: "Error", description: "Failed to send announcement", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkRead = async (announcementId: string) => {
    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking announcement as read:", error);
    }
  };

  const handleDelete = async (announcementId: string) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error("Failed to delete announcement");

      setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId));
      toast({ title: "Success", description: "Announcement deleted" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({ title: "Error", description: "Failed to delete announcement", variant: "destructive" });
    }
  };

  const getTargetIcon = (target: string) => {
    if (target === "all_schools") return <Globe className="w-3 h-3" />;
    if (target === "saas_admins") return <Crown className="w-3 h-3" />;
    if (target === "board_directors") return <Briefcase className="w-3 h-3" />;
    if (target === "investors") return <Heart className="w-3 h-3" />;
    if (target === "teachers") return <Users className="w-3 h-3" />;
    if (target === "students") return <GraduationCap className="w-3 h-3" />;
    if (target === "administration") return <ShieldCheck className="w-3 h-3" />;
    if (target === "personal") return <Star className="w-3 h-3 text-secondary" />;
    return <Building2 className="w-3 h-3" />;
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const userUid = user?.uid || "";
    const userRole = user?.role || "";

    // Personal Targeted Messages
    if (ann.target === "personal") {
      return ann.targetUid === userUid || ann.senderUid === userUid;
    }

    // Executive Visibility
    if (isPlatformExecutive) {
      if (["all_schools", "saas_admins", "board_directors", "investors"].includes(ann.target)) return true;
    }

    // Normal Filtering
    if (ann.target === "all_schools") return true;
    if (ann.target === "saas_admins") return isPlatformExecutive;
    if (ann.target === "board_directors") return ["CEO", "CTO", "COO", "SUPER_ADMIN", "DESIGNER"].includes(userRole);
    if (ann.target === "investors") return ["CEO", "INV", "SUPER_ADMIN"].includes(userRole);

    // My own messages
    if (ann.senderUid === userUid) return true;

    // School-level visibility
    return !isPlatformExecutive;
  });

  const AnnouncementCard = ({ ann }: { ann: any }) => (
    <Card
      className="border-none shadow-sm relative overflow-hidden group hover:shadow-md transition-all bg-white rounded-2xl cursor-pointer"
      onClick={() => handleMarkRead(ann.id)}
    >
      <div
        className={cn(
          "absolute top-0 left-0 w-1.5 h-full",
          ann.target === "personal"
            ? "bg-secondary"
            : ann.target === "all_schools"
              ? "bg-primary"
              : ann.target === "saas_admins"
                ? "bg-secondary"
                : ann.target === "investors"
                  ? "bg-rose-500"
                  : "bg-blue-500"
        )}
      />
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
              <AvatarImage src={ann.senderAvatar} alt={ann.senderName} />
              <AvatarFallback className="bg-primary/5 text-primary">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{ann.senderName}</span>
                <Badge variant="secondary" className="text-[9px] h-4 py-0 font-black uppercase tracking-wider bg-secondary/20 text-primary border-none">
                  {ann.senderRole}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(ann.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[9px] gap-1 shrink-0 uppercase border-primary/10 font-black", ann.target === "personal" ? "border-secondary text-primary bg-secondary/10" : "text-primary")}
          >
            {getTargetIcon(ann.target)}
            {ann.target === "personal" ? "Personal Alert" : ann.target.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardTitle className="text-lg font-black text-primary leading-tight">{ann.title}</CardTitle>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ann.content}</div>
      </CardContent>
      {ann.target === "personal" && (
        <CardFooter className="bg-accent/10 py-2 border-t flex justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-secondary" />
            <span className="text-[8px] font-black uppercase tracking-widest italic opacity-60">This message is an official platform record and cannot be replied to.</span>
          </div>
        </CardFooter>
      )}
      {(isCEO || user?.uid === ann.senderUid) && (
        <CardFooter className="pt-0 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive gap-2 text-[10px] font-black uppercase h-8"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(ann.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> {language === "en" ? "Remove" : "Supprimer"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  const handleRetry = () => {
    setHasError(false);
    window.location.reload();
  };

  if (hasError && !isLoadingAnnouncements) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-bold">Failed to Load Announcements</h2>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button onClick={handleRetry}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {canPost && (
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-primary font-headline">Broadcast</h1>
            <p className="text-muted-foreground text-sm">Strategic platform messaging suite.</p>
          </div>

          <Card className="border-none shadow-xl bg-primary text-white rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-white/10 p-8 border-b border-white/5">
              <CardTitle className="text-white uppercase tracking-tighter flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-secondary" />
                Dispatch Directive
              </CardTitle>
              <CardDescription className="text-white/60">Target your audience across the node network.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Recipient Target</Label>
                <Select value={formData.target} onValueChange={(v) => setFormData({ ...formData, target: v })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {isPlatformExecutive ? (
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-black uppercase opacity-40 px-3 py-2">Board Channels</SelectLabel>
                        {isCEO && <SelectItem value="all_schools" className="font-bold">All Registered Schools (CEO)</SelectItem>}
                        <SelectItem value="saas_admins">Full Board of Directors</SelectItem>
                        <SelectItem value="board_directors">Strategic Operations (Directors)</SelectItem>
                        <SelectItem value="investors">Investor Relations</SelectItem>
                      </SelectGroup>
                    ) : (
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-black uppercase opacity-40 px-3 py-2">Institutional Scope</SelectLabel>
                        <SelectItem value="everyone">Everyone (School-wide)</SelectItem>
                        <SelectItem value="teachers">All Teachers</SelectItem>
                        <SelectItem value="students">All Students</SelectItem>
                        <SelectItem value="administration">Administration Only</SelectItem>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Title</Label>
                <Input
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl font-bold"
                  placeholder="e.g. System Update or Fee Notice"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Content</Label>
                <Textarea
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[150px] rounded-xl leading-relaxed"
                  placeholder="Message body..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button
                variant="secondary"
                className="w-full h-14 gap-3 shadow-lg font-black uppercase tracking-widest text-xs rounded-2xl bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleSend}
                disabled={isSending || !formData.title || !formData.content}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t("sendAnnouncement")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <div className={cn("space-y-6", canPost ? "lg:col-span-8" : "lg:col-span-12")}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-primary uppercase tracking-tighter flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-secondary" />
              Strategic Dispatch Ledger
            </h2>
            <p className="text-xs text-muted-foreground">Authorized platform communiqués and institutional alerts.</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-8 px-3 rounded-full font-black text-xs">
              {unreadCount} Unread
            </Badge>
          )}
          {isPlatformExecutive && (
            <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/10 text-primary font-black uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-secondary" />
              Board Feed
            </Badge>
          )}
        </div>

        {isLoadingAnnouncements ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredAnnouncements.map((ann) => (
              <AnnouncementCard key={ann.id} ann={ann} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-primary/10">
            <Megaphone className="w-16 h-16 text-primary/10" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No announcements in the registry.</p>
          </div>
        )}
      </div>
    </div>
  );
}
