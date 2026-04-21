
"use client";

import { useAuth } from "@/lib/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  PenTool, 
  Calendar, 
  ShieldCheck,
  Building2,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { communityService } from "@/lib/api/services/community.service";
import { resolveMediaUrl } from "@/lib/media";

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { communityBlogs, platformSettings } = useAuth();
  const [blog, setBlog] = useState<any>(null);
  const platformLogo = resolveMediaUrl(platformSettings.logo);

  useEffect(() => {
    const found = communityBlogs.find(b => b.id === params.id);
    if (found) {
      setBlog(found);
      return;
    }
    if (!params.id) return;

    communityService.viewBlog(String(params.id))
      .then((record: any) => {
        setBlog({
          id: record.id,
          title: record.title,
          senderName: record.author?.name || "EduIgnite Board",
          senderRole: record.author?.role || "Executive",
          senderAvatar: resolveMediaUrl(record.author?.avatar),
          image: resolveMediaUrl(record.image),
          paragraphs: Array.isArray(record.paragraphs) ? record.paragraphs : [],
          createdAt: record.created_at,
        });
      })
      .catch(() => setBlog(null));
  }, [params.id, communityBlogs]);

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Syncing Strategic Record</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-primary/5">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="rounded-xl font-bold gap-2 text-primary hover:bg-primary/5"
            onClick={() => router.push('/community#logs')}
          >
            <ChevronLeft className="w-5 h-5" /> Back to Community
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg">
              {platformLogo ? (
                <img src={platformLogo} alt={platformSettings.name} className="w-5 h-5 object-contain" />
              ) : (
                <Building2 className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-sm font-black text-primary font-headline tracking-tighter uppercase">
              {platformSettings.name} Strategic Hub
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* LOG METADATA */}
        <section className="space-y-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/5 px-4 py-1 rounded-full border border-primary/10">
            <PenTool className="w-4 h-4 text-secondary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Strategic Node Audit</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-primary uppercase tracking-tighter leading-tight">
            {blog.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-secondary" />
              {new Date(blog.createdAt || Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              Official Board Record
            </div>
          </div>
        </section>

        {/* HERO IMAGE */}
        {blog.image && (
          <div className="aspect-[21/9] w-full rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white ring-1 ring-primary/5">
            <img src={blog.image} className="w-full h-full object-cover" alt="Strategic update media" />
          </div>
        )}

        {/* CONTENT */}
        <Card className="border-none shadow-xl rounded-[3rem] bg-white p-8 md:p-16">
          <div className="space-y-8 max-w-2xl mx-auto">
            {(blog.paragraphs || []).map((p: string, i: number) => (
              <p key={i} className="text-xl text-muted-foreground leading-relaxed font-medium first-letter:text-5xl first-letter:font-black first-letter:text-primary first-letter:mr-2">
                {p}
              </p>
            ))}
          </div>

          <div className="pt-16 mt-16 border-t flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border-4 border-white shadow-2xl ring-1 ring-primary/5">
                <AvatarImage src={blog.senderAvatar} />
                <AvatarFallback className="bg-primary text-white font-bold">{(blog.senderName || "E").charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-black text-primary text-2xl uppercase leading-none mb-1">{blog.senderName}</p>
                <p className="text-xs font-bold text-secondary uppercase tracking-widest">{blog.senderRole} • {platformSettings.name} Leadership</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center opacity-20">
               <ShieldCheck className="w-16 h-16 text-primary" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Verified Log Integrity</span>
            </div>
          </div>
        </Card>

        {/* FOOTER CTA */}
        <section className="pt-12 text-center">
           <Button 
            className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-2xl"
            onClick={() => router.push('/community#order')}
           >
             Join the Regional Node Network <ChevronLeft className="w-4 h-4 rotate-180" />
           </Button>
        </section>
      </main>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <div className={cn("animate-spin", className)}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V6M12 18V22M6 12H2M18 12H22M5.636 5.636L8.464 8.464M15.536 15.536L18.364 18.364M5.636 18.364L8.464 15.536M15.536 8.464L18.364 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
