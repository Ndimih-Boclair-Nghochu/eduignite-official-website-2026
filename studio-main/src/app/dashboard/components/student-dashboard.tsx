"use client";

import { useAuth } from "@/lib/auth-context";
import { useGrades, useAnnualResults } from "@/lib/hooks/useGrades";
import { useMyAttendance } from "@/lib/hooks/useAttendance";
import { useMyLoans } from "@/lib/hooks/useLibrary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, ClipboardCheck, ListChecks, BookMarked, ShieldCheck, TrendingUp, BookOpen, Calendar, Clock, MapPin, Zap, ChevronRight } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DATA_PERIODS, STUDENT_TODAY_SCHEDULE } from "./dashboard-mock-data";

export function StudentDashboard() {
  const { user } = useAuth();
  const { data: gradesResp } = useGrades();
  const { data: annualResp } = useAnnualResults();
  const { data: attendanceResp } = useMyAttendance();
  const { data: myLoansResp } = useMyLoans();

  // Real annual average from API, fallback to mock
  const annualAvg = user?.annual_avg ?? annualResp?.results?.[0]?.annual_average ?? 0;
  const annualAvgDisplay = Number(annualAvg).toFixed(2);
  const attendanceRecords = attendanceResp?.results ?? [];
  const presentAttendance = attendanceRecords.filter((record: any) => ["present", "late", "Present", "Late"].includes(record.status)).length;
  const attendanceRate = attendanceRecords.length ? Math.round((presentAttendance / attendanceRecords.length) * 100) : 0;
  const activeLoans = myLoansResp?.results ?? [];

  // Real recent grades from API, fallback to mock
  const recentResults = gradesResp?.results?.slice(0, 5).map(g => ({
    subject: g.subject.name,
    score: g.score,
    coefficient: g.subject.coefficient,
    comment: g.comment,
    date: new Date(g.created_at).toLocaleDateString(),
  })) ?? [];

  // Real subject performance averages from API
  const subjectPerf = gradesResp?.results
    ? Object.entries(
        gradesResp.results.reduce((acc, g) => {
          const name = g.subject.name;
          if (!acc[name]) acc[name] = { total: 0, count: 0 };
          acc[name].total += Number(g.score);
          acc[name].count += 1;
          return acc;
        }, {} as Record<string, {total:number;count:number}>)
      ).map(([subject, d]) => ({
        name: subject,
        score: parseFloat((d.total/d.count).toFixed(1))
      }))
    : [];

  // Check honour roll status
  const isOnHonourRoll = annualResp?.results?.[0]?.is_on_honour_roll ?? false;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-white shadow-xl shrink-0 ring-4 ring-primary/5">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary font-headline tracking-tighter uppercase leading-tight">Welcome, {user?.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/5 text-primary border-primary/10 h-5 px-3 font-black uppercase text-[10px] tracking-widest">
                {(user as any)?.class || (user as any)?.student_class || "Student"}
              </Badge>
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">• Matricule: {user?.id}</span>
            </div>
          </div>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-3 shadow-sm w-full sm:w-fit">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <p className="text-xs font-bold text-green-700">Student Node Active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Term Average", value: `${annualAvgDisplay} / 20`, icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Attendance Integrity", value: `${attendanceRate}%`, icon: ClipboardCheck, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Pending Tasks", value: `${Math.max(0, 5 - recentResults.length)} Assignments`, icon: ListChecks, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Library Loans", value: `${activeLoans.length} Volumes`, icon: BookMarked, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm group hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-primary">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white">
          <CardHeader className="bg-primary/5 p-5 sm:p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary"/> Performance Velocity
              </CardTitle>
              <CardDescription>Visualizing your academic evolution over the current term.</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/10 text-primary font-bold uppercase text-[9px] px-3">VERIFIED RECORDS</Badge>
          </CardHeader>
          <CardContent className="h-[300px] sm:h-[350px] pt-6 sm:pt-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA_PERIODS.monthly}>
                <defs>
                  <linearGradient id="colorStudentPerf" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#264D73" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#264D73" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area name="Sequence Mark" type="monotone" dataKey="performance" stroke="#264D73" strokeWidth={4} fill="url(#colorStudentPerf)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-primary text-white flex flex-col">
          <CardHeader className="p-5 sm:p-8">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-secondary" />
              Subject Proficiency
            </CardTitle>
            <CardDescription className="text-white/60">Latest evaluation benchmarks.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-6 sm:pt-10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectPerf}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#fff' }} />
                <YAxis hide />
                <RechartsTooltip />
                <Bar dataKey="score" radius={[10, 10, 0, 0]} barSize={20} fill="#67D0E4" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {subjectPerf.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
                  <Badge className="bg-secondary text-primary border-none font-black">{item.score}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-white border-b p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-secondary" />
                Today&apos;s Sequence
              </CardTitle>
              <CardDescription>Your chronological academic timetable for today.</CardDescription>
            </div>
            <Badge className="bg-secondary text-primary border-none font-black h-7 px-4">LIVE NODE</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {STUDENT_TODAY_SCHEDULE.map((slot, i) => (
                  <TableRow key={i} className="hover:bg-primary/5 transition-colors border-b last:border-0 h-16">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-accent/30 text-primary">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-primary uppercase">{slot.subject}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{slot.time}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5"><MapPin className="w-3 h-3 text-secondary" /> {slot.room}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{slot.teacher}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-none shadow-xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white">
          <CardHeader className="bg-white border-b p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Zap className="w-5 h-5 text-secondary" />
                Recent Results
              </CardTitle>
              <CardDescription>Latest marks registered in your dossier.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {recentResults.map((res, i) => (
                  <TableRow key={i} className="hover:bg-primary/5 border-b last:border-0 h-16">
                    <TableCell className="pl-8">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-primary uppercase leading-none">{res.subject}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{res.date}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-primary">{res.score} <span className="text-[10px] opacity-40">/ 20</span></span>
                        <span className="text-[8px] font-bold uppercase text-secondary">{res.comment ? "Reviewed" : "Pending"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="bg-accent/10 p-4 border-t flex justify-center">
            <Button asChild variant="ghost" className="text-[10px] font-black uppercase gap-2 hover:bg-white transition-all">
              <Link href="/dashboard/grades">Access Full Report Card <ChevronRight className="w-3.5 h-3.5"/></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
