
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Award, Calendar, BookOpen, ChevronRight, User, Trophy, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const CHILDREN = [
  {
    id: "GBHS26S001",
    name: "Alice Thompson",
    grade: "2nde / Form 5",
    gpa: "16.45",
    attendance: "98%",
    nextClass: "Physics 101 - 09:00 AM",
    avatar: "https://picsum.photos/seed/alice/200/200"
  },
  {
    id: "GBHS26S004",
    name: "Diana Thompson",
    grade: "4ème / Form 3",
    gpa: "14.20",
    attendance: "95%",
    nextClass: "Biology Lab - 10:30 AM",
    avatar: "https://picsum.photos/seed/diana/200/200"
  }
];

export default function ChildrenPage() {
  const { t, language } = useI18n();
  const { platformSettings } = useAuth();
  const threshold = platformSettings.honourRollThreshold || 15.0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">
          {language === "en" ? "My Children" : "Mes Enfants"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {language === "en" 
            ? "Strategic oversight of your children's pedagogical progress." 
            : "Surveillance stratégique des progrès pédagogiques de vos enfants."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CHILDREN.map((child) => {
          const isHonourRoll = parseFloat(child.gpa) >= threshold;
          return (
            <Card key={child.id} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow bg-white rounded-[2rem]">
              <CardHeader className="flex flex-row items-center gap-4 bg-accent/30 p-8">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl shrink-0 group-hover:scale-105 transition-transform">
                  <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-black text-primary uppercase leading-tight">{child.name}</CardTitle>
                    {isHonourRoll && <Trophy className="w-5 h-5 text-secondary fill-secondary/20" />}
                  </div>
                  <CardDescription className="font-bold text-primary/60 uppercase text-xs tracking-widest">
                    ID: {child.id} • {child.grade}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isHonourRoll ? (
                      <Badge className="bg-primary text-secondary border-none font-black uppercase text-[9px] px-3 h-6 gap-1.5">
                        <Trophy className="w-3 h-3" /> HONOUR ROLL
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-primary/10 text-[9px] font-bold uppercase h-6 gap-1.5 bg-white">
                        <AlertCircle className="w-3 h-3" /> NOT YET ELIGIBLE
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-accent/20 p-4 rounded-2xl border border-accent">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1.5 mb-1">
                      <Award className="w-3.5 h-3.5 text-secondary"/> {language === "en" ? "Term Average" : "Moyenne"}
                    </p>
                    <p className="text-2xl font-black text-primary">{child.gpa} <span className="text-xs opacity-40">/ 20</span></p>
                  </div>
                  <div className="bg-accent/20 p-4 rounded-2xl border border-accent">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-secondary"/> {language === "en" ? "Attendance" : "Présence"}
                    </p>
                    <p className="text-2xl font-black text-primary">{child.attendance}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] font-black uppercase text-primary/40 tracking-widest mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> {language === "en" ? "Current Slot" : "Séquence Actuelle"}
                  </p>
                  <p className="font-bold text-primary text-sm">{child.nextClass}</p>
                </div>

                <Button className="w-full h-14 rounded-2xl shadow-xl font-black uppercase tracking-widest text-xs gap-3 group bg-primary text-white" asChild>
                  <Link href={`/dashboard/children/view?id=${child.id}`}>
                    Open Full Dossier
                    <div className="bg-secondary p-1.5 rounded-lg group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
