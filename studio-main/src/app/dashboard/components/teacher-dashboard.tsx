"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Activity, ShieldCheck, TrendingUp, LayoutGrid, ListChecks, BookOpen, PenTool, Award, Download, FileBadge, Signature as SignatureIcon, Loader2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useStudents } from "@/lib/hooks/useStudents";
import { useGrades } from "@/lib/hooks/useGrades";
import { useAttendanceSessions } from "@/lib/hooks/useAttendance";
import { DATA_PERIODS, TEACHER_CLASS_DATA, UPCOMING_TASKS } from "./dashboard-mock-data";

export function TeacherDashboard() {
  const { user, staffRemarks } = useAuth();
  const { toast } = useToast();
  const { data: studentsResp, isLoading: studentsLoading } = useStudents();
  const { data: gradesResp, isLoading: gradesLoading } = useGrades();
  const { data: sessionsResp, isLoading: sessionsLoading } = useAttendanceSessions();

  const myRemarks = useMemo(() => staffRemarks.filter(r => r.staffId === user?.id), [staffRemarks, user?.id]);

  const totalStudents = studentsResp?.count ?? 0;
  const totalGradesEntered = gradesResp?.count ?? 0;
  const totalSessionsHeld = sessionsResp?.count ?? 0;

  const classData = useMemo(() => {
    if (gradesResp?.results && Array.isArray(gradesResp.results)) {
      const grouped = gradesResp.results.reduce((acc, g: any) => {
        const cls = g.student_class || 'Unknown';
        if (!acc[cls]) acc[cls] = { total: 0, count: 0 };
        acc[cls].total += Number(g.score || 0);
        acc[cls].count += 1;
        return acc;
      }, {} as Record<string, {total:number; count:number}>);

      return Object.entries(grouped).map(([name, d]) => ({
        name,
        average: parseFloat((d.total / d.count).toFixed(1))
      }));
    }
    return TEACHER_CLASS_DATA;
  }, [gradesResp?.results]);

  const handleDownloadRemark = () => {
    toast({ title: "Dossier Preparation", description: "Generating formal administrative report..." });
    setTimeout(() => {
      toast({ title: "Report Ready", description: "Download successful." });
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-white shadow-xl shrink-0 ring-4 ring-primary/5">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline tracking-tighter">Welcome back, {user?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black uppercase text-[10px] h-5 px-3">
                Pedagogical Lead
              </Badge>
              {user?.school && (
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">• {user.school.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-3 shrink-0">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <p className="text-xs font-bold text-green-700">Digital Node Sync Active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: totalStudents, isLoading: studentsLoading, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Grades Entered", value: totalGradesEntered, isLoading: gradesLoading, icon: ListChecks, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Sessions Held", value: totalSessionsHeld, isLoading: sessionsLoading, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Active Assignments", value: "3 Tasks", isLoading: false, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm group hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-black text-primary">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-primary/5 p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary"/> Performance Velocity
              </CardTitle>
              <CardDescription>Aggregate student mean scores over current evaluation cycle.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA_PERIODS.monthly}>
                <defs>
                  <linearGradient id="colorPerf" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#264D73" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#264D73" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area name="Avg Mark" type="monotone" dataKey="performance" stroke="#264D73" strokeWidth={4} fill="url(#colorPerf)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white flex flex-col">
          <CardHeader className="bg-primary p-8 text-white">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-secondary" />
              Class Performance
            </CardTitle>
            <CardDescription className="text-white/60">Average scores per class.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis hide />
                <RechartsTooltip />
                <Bar dataKey="average" radius={[10, 10, 0, 0]} barSize={25} fill="#67D0E4" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {classData.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-accent/20 border border-accent">
                  <span className="text-xs font-bold text-primary uppercase">{item.name}</span>
                  <Badge variant="outline" className="border-primary/10 text-primary font-black">{item.average}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-white border-b p-8 flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <PenTool className="w-5 h-5 text-secondary" />
                Upcoming Pedagogical Tasks
              </CardTitle>
              <CardDescription>Timeline of markers and administrative duties.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {UPCOMING_TASKS.map((task) => (
                  <TableRow key={task.id} className="hover:bg-primary/5 transition-colors border-b last:border-0 h-16">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-accent/30 text-primary">
                          <task.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-primary uppercase">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{task.class}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Badge className={cn(
                        "text-[8px] font-black uppercase border-none px-3 mb-1",
                        task.status === 'Urgent' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {task.status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground font-bold italic">{task.deadline}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-secondary/20 p-8 flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Admin Evaluation
              </CardTitle>
              <CardDescription>Official professional feedback from the principal.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {myRemarks.length > 0 ? (
              <div className="space-y-4">
                {myRemarks.map((remark) => (
                  <div key={remark.id} className="p-6 bg-accent/30 rounded-2xl border border-accent space-y-4 animate-in fade-in zoom-in-95">
                    <p className="text-sm italic font-medium text-primary leading-relaxed">
                      &ldquo;{remark.text}&rdquo;
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-accent/50">
                      <div className="flex items-center gap-2">
                        <SignatureIcon className="w-4 h-4 text-primary/40" />
                        <span className="text-[10px] font-black uppercase text-primary/60">{remark.adminName} • {remark.date}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase bg-white shadow-sm" onClick={handleDownloadRemark}>
                        <Download className="w-3.5 h-3.5" /> PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-40">
                <FileBadge className="w-12 h-12" />
                <p className="text-xs font-bold uppercase tracking-widest">No formal remarks in dossier.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
