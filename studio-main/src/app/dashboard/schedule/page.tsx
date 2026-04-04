
"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, User, AlertCircle, CalendarDays, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TIMETABLE = {
  Monday: [
    { time: "09:00 AM", subject: "Advanced Physics", room: "Room 402", instructor: "Dr. Tesla", type: "Teacher-Led" },
    { time: "02:00 PM", subject: "General Chemistry", room: "Lab C", instructor: "Dr. White", type: "Teacher-Led" },
  ],
  Tuesday: [
    { time: "11:30 AM", subject: "Calculus II", room: "Room 201", instructor: "Prof. Smith", type: "Teacher-Led" },
  ],
  Wednesday: [
    { time: "09:00 AM", subject: "Advanced Physics", room: "Room 402", instructor: "Dr. Tesla", type: "Teacher-Led" },
    { time: "02:00 PM", subject: "General Chemistry", room: "Lab C", instructor: "Dr. White", type: "Teacher-Led" },
  ],
  Thursday: [
    { time: "11:30 AM", subject: "Calculus II", room: "Room 201", instructor: "Prof. Smith", type: "Teacher-Led" },
  ],
  Friday: [
    { time: "10:00 AM", subject: "English Literature", room: "Hall B", instructor: "Ms. Bennet", type: "Teacher-Led" },
  ],
};

export default function SchedulePage() {
  const { user } = useAuth();
  
  if (user?.role === "STUDENT" || user?.role === "PARENT") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-primary/5 p-8 rounded-full border-2 border-dashed border-primary/20">
          <Lock className="w-16 h-16 text-primary/20" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Access Restricted</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Direct access to the institutional master schedule is restricted for your role. Please refer to your personalized dashboard for academic updates.
          </p>
        </div>
        <Button asChild className="rounded-xl px-10 h-12 shadow-lg font-bold">
          <Link href="/dashboard">Return to Overview</Link>
        </Button>
      </div>
    );
  }

  const isTeacher = user?.role === "TEACHER";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <CalendarDays className="w-6 h-6 text-secondary" />
            </div>
            {isTeacher ? "My Teaching Schedule" : "Class Schedule"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher 
              ? "Your automatically generated duty timetable based on institutional subject assignments."
              : "Your current weekly academic timetable as per the institutional master plan."
            }
          </p>
        </div>
        
        {isTeacher && (
          <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-[10px] font-black uppercase text-green-600 tracking-widest leading-none">Status</p>
              <p className="text-sm font-bold text-green-700">All Slots Synchronized</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {DAYS.map((day) => (
          <div key={day} className="space-y-4">
            <h3 className="font-bold text-lg text-primary border-b-2 border-primary/10 pb-2 uppercase tracking-tighter">{day}</h3>
            <div className="space-y-3">
              {(TIMETABLE as any)[day].length > 0 ? (
                (TIMETABLE as any)[day].map((slot: any, idx: number) => (
                  <Card key={idx} className="border-none shadow-sm group hover:ring-2 hover:ring-primary/20 transition-all bg-white/50 backdrop-blur-sm">
                    <CardHeader className="p-4 pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[9px] font-black bg-white border-primary/10 text-primary">
                          {slot.time}
                        </Badge>
                        {isTeacher && <Badge className="bg-secondary text-primary border-none text-[8px] h-4">SYNC</Badge>}
                      </div>
                      <CardTitle className="text-sm font-black leading-tight text-primary">{slot.subject}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                          <MapPin className="w-3.5 h-3.5 text-primary/40" />
                          <span>{slot.room}</span>
                        </div>
                        {!isTeacher && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                            <User className="w-3.5 h-3.5 text-primary/40" />
                            <span>{slot.instructor}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest py-8 text-center border-2 border-dashed rounded-2xl bg-accent/5">
                  No Assignments
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
