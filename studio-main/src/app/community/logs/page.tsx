"use client";

import Link from "next/link";
import { ArrowLeft, Building2, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { resolveMediaUrl } from "@/lib/media";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CommunityLogsPage() {
  const { communityBlogs, platformSettings } = useAuth();
  const platformLogo = resolveMediaUrl(platformSettings.logo);

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <header className="sticky top-0 z-50 w-full border-b border-primary/5 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <Link href="/community" className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 shadow-lg">
              {platformLogo ? (
                <img src={platformLogo} alt={platformSettings.name} className="h-6 w-6 object-contain" />
              ) : (
                <Building2 className="h-6 w-6 text-white" />
              )}
            </div>
            <span className="font-headline text-xl font-black tracking-tighter text-primary">
              Strategic Logs
            </span>
          </Link>
          <Button asChild variant="outline" className="rounded-xl border-primary/10 bg-white font-bold text-primary">
            <Link href="/community">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-12">
        <div className="max-w-3xl space-y-3">
          <Badge className="border-none bg-secondary text-primary">OFFICIAL BOARD ARCHIVE</Badge>
          <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-primary md:text-6xl">
            All Existing Strategic Logs
          </h1>
          <p className="text-muted-foreground">
            Browse every published leadership update and platform decision shared with the EduIgnite community.
          </p>
        </div>

        {communityBlogs.length === 0 ? (
          <Card className="rounded-[2rem] border-none bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-primary/20" />
            <p className="mt-4 font-bold text-muted-foreground">No strategic logs have been published yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {communityBlogs.map((blog) => (
              <Card key={blog.id} className="group flex flex-col overflow-hidden rounded-[2rem] border-none bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-primary/5">
                  {blog.image ? (
                    <img src={blog.image} alt={blog.title || "Strategic log"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-12 w-12 text-primary/10" />
                    </div>
                  )}
                  <Badge className="absolute left-4 top-4 border-none bg-secondary text-[8px] font-black text-primary">OFFICIAL</Badge>
                </div>
                <CardHeader className="space-y-4 p-6">
                  <h2 className="line-clamp-2 min-h-[3rem] text-xl font-black uppercase leading-tight tracking-tight text-primary">
                    {blog.title || "Platform Update"}
                  </h2>
                  <div className="flex items-center gap-3 border-t border-accent/60 pt-4">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                      <AvatarImage src={blog.senderAvatar} />
                      <AvatarFallback className="bg-primary text-white">{(blog.senderName || "E").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase text-primary">{blog.senderName || "EduIgnite Board"}</p>
                      <p className="text-[9px] font-bold uppercase text-muted-foreground">{blog.senderRole || "Executive"}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="mt-auto p-6 pt-0">
                  <Button asChild className="h-11 w-full rounded-xl bg-primary/5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white">
                    <Link href={`/community/logs/${blog.id}`}>
                      Open Log <ChevronRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
