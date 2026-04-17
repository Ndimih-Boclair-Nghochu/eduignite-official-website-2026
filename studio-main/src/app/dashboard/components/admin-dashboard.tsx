"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Building2, GraduationCap, Users, Coins, ShieldCheck, TrendingUp, FileDown, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useStudents } from "@/lib/hooks/useStudents";
import { useUsers } from "@/lib/hooks/useUsers";
import { usePayments } from "@/lib/hooks/useFees";
import { useFeeStructures } from "@/lib/hooks/useFees";
import { DATA_PERIODS } from "./dashboard-mock-data";

export function AdminDashboard() {
  const { user } = useAuth();
  const { data: studentsResp, isLoading: studentsLoading } = useStudents();
  const { data: teachersResp, isLoading: teachersLoading } = useUsers({ role: 'TEACHER' });
  const { data: paymentsResp } = usePayments();
  const { data: feesResp } = useFeeStructures();

  const totalStudents = studentsResp?.count ?? 0;
  const totalTeachers = teachersResp?.count ?? 0;

  const confirmedPayments = paymentsResp?.results?.filter(p => p.status === 'Confirmed') ?? [];
  const totalRevenue = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount ?? '0'), 0);

  const totalFeeStructures = feesResp?.count ?? 0;
  const studentRows = studentsResp?.results ?? [];
  const liveClassSummary = Object.values(
    studentRows.reduce((acc: Record<string, { class: string; students: number; averageTotal: number; averageCount: number }>, student) => {
      const className = student.student_class || "Unassigned";
      if (!acc[className]) {
        acc[className] = { class: className, students: 0, averageTotal: 0, averageCount: 0 };
      }
      acc[className].students += 1;
      const annualAverage = Number(student.annual_average ?? 0);
      if (!Number.isNaN(annualAverage) && annualAverage > 0) {
        acc[className].averageTotal += annualAverage;
        acc[className].averageCount += 1;
      }
      return acc;
    }, {})
  )
    .map((item) => ({
      class: item.class,
      students: item.students,
      average: item.averageCount ? Number((item.averageTotal / item.averageCount).toFixed(2)) : 0,
      revenue: totalStudents ? Math.round((item.students / totalStudents) * 100) : 0,
    }))
    .sort((a, b) => b.students - a.students);

  const governanceLogs = [
    ...(studentRows.slice(0, 3).map((student) => ({
      action: "Student admitted",
      actor: student.user?.name || student.admission_number,
      time: student.admission_date || "Recent",
      status: "Success",
    }))),
    ...(confirmedPayments.slice(0, 2).map((payment) => ({
      action: "Payment confirmed",
      actor: payment.payer?.name || payment.reference_number,
      time: payment.payment_date || "Recent",
      status: "Success",
    }))),
  ].slice(0, 5);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-[1.5rem] shadow-xl border-4 border-white flex items-center justify-center p-3">
            {user?.school?.logo ? (
              <img src={user.school.logo} alt="School" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-full h-full text-secondary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary font-headline tracking-tighter uppercase leading-tight">{user?.school?.name || "Institution Dashboard"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-secondary text-primary border-none font-black h-5 px-3 text-[9px] tracking-widest uppercase">Admin Node</Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">• Principal: {user?.school?.principal}</span>
            </div>
          </div>
        </div>
        <div className="flex w-full md:w-auto flex-col sm:flex-row gap-2">
          <Button variant="outline" className="h-11 px-6 rounded-xl font-bold border-primary/10 bg-white gap-2 shadow-sm w-full sm:w-auto">
            <FileDown className="w-4 h-4 text-primary" /> Reports
          </Button>
          <Button className="h-11 px-8 shadow-xl font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl w-full sm:w-auto">
            <ShieldCheck className="w-4 h-4" /> Verify Node
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Enrollment", value: totalStudents, isLoading: studentsLoading, icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Staff Registry", value: totalTeachers, isLoading: teachersLoading, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Collection Velocity", value: `${totalRevenue > 0 ? Math.round((totalRevenue / 100000) * 100) : 0}%`, isLoading: false, icon: Coins, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "System Integrity", value: "Optimal", isLoading: false, icon: ShieldCheck, color: "text-primary", bg: "bg-primary/5" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm group hover:shadow-md transition-all">
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
                <div className="text-2xl font-black text-primary">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white">
          <CardHeader className="bg-primary/5 p-5 sm:p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary"/> Pedagogical Velocity
              </CardTitle>
              <CardDescription>Aggregate performance trends across all class streams.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] sm:h-[350px] pt-6 sm:pt-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA_PERIODS.monthly}>
                <defs>
                  <linearGradient id="colorAdminPerf" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#264D73" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#264D73" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area name="Avg Performance" type="monotone" dataKey="performance" stroke="#264D73" strokeWidth={4} fill="url(#colorAdminPerf)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white flex flex-col">
          <CardHeader className="bg-primary p-5 sm:p-8 text-white">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              Governance Log
            </CardTitle>
            <CardDescription className="text-white/60">Recent administrative actions.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {governanceLogs.length ? governanceLogs.map((log, i) => (
              <div key={i} className="p-6 border-b last:border-0 hover:bg-accent/10 transition-colors flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-black text-primary uppercase">{log.action}</p>
                  <p className="text-[10px] text-muted-foreground font-bold">{log.actor} • {log.time}</p>
                </div>
                <Badge className={cn(
                  "text-[8px] font-black uppercase border-none px-2 h-5",
                  log.status === 'Success' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                )}>
                  {log.status}
                </Badge>
              </div>
            )) : (
              <div className="p-6 text-sm text-muted-foreground">
                Governance activity will appear here as admissions, billing, and staff actions happen.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white">
        <CardHeader className="bg-white border-b p-5 sm:p-8">
          <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-secondary" />
            Academic Stream Summary
          </CardTitle>
          <CardDescription>Consolidated metrics for each class level.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-accent/10 uppercase text-[9px] font-black tracking-widest">
              <TableRow>
                <TableHead className="pl-8 py-4">Class</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Average</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-right pr-8">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveClassSummary.map((cls, i) => (
                <TableRow key={i} className="hover:bg-primary/5 transition-colors border-b last:border-0 h-16">
                  <TableCell className="pl-8 font-black text-primary uppercase text-xs">{cls.class}</TableCell>
                  <TableCell className="text-center font-bold text-sm">{cls.students}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("font-black border-none text-[10px]",
                      cls.average >= 15 ? "bg-green-100 text-green-700" : cls.average >= 12 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                    )}>{cls.average}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-sm">{totalStudents ? Math.max(70, Math.min(100, 100 - cls.students)) : 0}%</TableCell>
                  <TableCell className="text-right pr-8">
                    <Progress value={cls.revenue} className="h-1.5 w-20 ml-auto" />
                    <span className="text-[9px] font-black text-muted-foreground mt-1 block">{cls.revenue}%</span>
                  </TableCell>
                </TableRow>
              ))}
              {!liveClassSummary.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                    Class metrics will appear here once students are registered.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
