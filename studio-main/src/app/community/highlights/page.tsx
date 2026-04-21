"use client";

import Link from "next/link";
import { ArrowLeft, Building2, ImageIcon, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { resolveMediaUrl } from "@/lib/media";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CommunityHighlightsPage() {
  const { publicEvents, platformSettings } = useAuth();
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
              Institutional Highlights
            </span>
          </Link>
          <Button asChild variant="outline" className="rounded-xl border-primary/10 bg-white font-bold text-primary">
            <Link href="/community#events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-12">
        <div className="max-w-3xl space-y-3">
          <Badge className="border-none bg-secondary text-primary">COMMUNITY ARCHIVE</Badge>
          <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-primary md:text-6xl">
            All Institutional Highlights
          </h1>
          <p className="text-muted-foreground">
            Every published photo and video highlight from the EduIgnite platform community.
          </p>
        </div>

        {publicEvents.length === 0 ? (
          <Card className="rounded-[2rem] border-none bg-white p-10 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-primary/20" />
            <p className="mt-4 font-bold text-muted-foreground">No institutional highlights have been published yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {publicEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden rounded-[3rem] border-none bg-white shadow-2xl transition-all duration-500 hover:shadow-primary/5">
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  {event.type === "video" ? (
                    <iframe
                      src={event.url}
                      className="h-full w-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <img src={event.url} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  )}
                  <div className="absolute left-6 top-6">
                    <Badge className="h-7 border-none bg-black/60 px-4 text-[9px] font-black uppercase text-white backdrop-blur-xl">
                      {event.type === "video" ? (
                        <>
                          <Video className="mr-2 h-3.5 w-3.5" /> VIDEO
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-3.5 w-3.5" /> PHOTO
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-black leading-tight text-primary">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
                    {event.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
