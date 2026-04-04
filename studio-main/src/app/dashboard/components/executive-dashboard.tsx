"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, Globe, GraduationCap, ArrowUpRight, Calendar, PieChart, Zap, Crown, TrendingUp, Loader2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { usePlatformStats } from "@/lib/hooks/usePlatform";
import { DATA_PERIODS, USER_DISTRIBUTION } from "./dashboard-mock-data";

export function ExecutiveDashboard() {
  const { schools } = useAuth();
  const [timePeriod, setTimePeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [selectedSchoolId, setSelectedSchoolId] = useState("all");
  const [isDataSyncing, setIsDataSyncing] = useState(true);

  const { data: stats, isLoading: statsLoading } = usePlatformStats();

  useEffect(() => {
    const timer = setTimeout(() => setIsDataSyncing(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const activeChartData = useMemo(() => DATA_PERIODS[timePeriod] || DATA_PERIODS.monthly, [timePeriod]);

  const userDistribution = useMemo(() => {
    if (stats?.users_by_role) {
      return Object.entries(stats.users_by_role).map(([role, count], i) => ({
        name: role,
        value: count,
        color: ['#264D73','#67D0E4','#FCD116','#CE1126','#10B981','#8B5CF6'][i % 6]
      }));
    }
    return USER_DISTRIBUTION;
  }, [stats?.users_by_role]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            Platform Intelligence
          </h1>
          <p className="text-muted-foreground">Strategic network analysis and institutional revenue metrics.</p>
        </div>

        <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border flex flex-wrap items-center gap-3 w-fit">
          <div className="flex items-center gap-2 px-3 border-r">
            <Calendar className="w-4 h-4 text-primary/40" />
            <Select value={timePeriod} onValueChange={(v: any) => setTimePeriod(v)}>
              <SelectTrigger className="w-[120px] border-none shadow-none h-9 text-xs font-bold focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <Building2 className="w-4 h-4 text-primary/40" />
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger className="w-[180px] border-none shadow-none h-9 text-xs font-bold focus:ring-0">
                <SelectValue placeholder="All Institutions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire Network</SelectItem>
                {(schools || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isDataSyncing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <Card className="border-none shadow-sm bg-primary text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users className="w-16 h-16"/></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-black opacity-60 tracking-widest">Global Users</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-20 bg-white/20 animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-black text-secondary">{stats?.total_users ?? 0}</div>
              )}
              <p className="text-[9px] font-bold mt-2 uppercase flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> +12% Growth</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Active Schools</CardTitle>
              <GraduationCap className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-black text-primary">{stats?.active_schools ?? stats?.total_schools ?? 0}</div>
              )}
              <p className="text-[9px] font-bold mt-1 text-muted-foreground uppercase">Active Network</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Teachers</CardTitle>
              <Users className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-black text-primary">{stats?.total_teachers ?? 0}</div>
              )}
              <p className="text-[9px] font-bold mt-1 text-muted-foreground uppercase">Active Curriculums</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">New Orders</CardTitle>
              <Crown className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-black text-primary">{stats?.new_orders ?? 0}</div>
              )}
              <p className="text-[9px] font-bold mt-1 text-muted-foreground uppercase">This Period</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-secondary text-primary overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-black opacity-60 tracking-widest">Net Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-24 bg-primary/20 animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-black">{stats?.total_revenue ? `XAF ${Number(stats.total_revenue).toLocaleString()}` : 'XAF 0'}</div>
              )}
              <p className="text-[9px] font-bold mt-1 uppercase">Platform Licenses</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white">
          <CardHeader className="border-b bg-accent/5 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                Revenue & User Intake Velocity
              </CardTitle>
              <CardDescription>Analyzing {timePeriod} trends across the network.</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/5 text-primary border-none uppercase text-[9px] font-black h-7 px-3">
              <Zap className="w-3 h-3 mr-1.5" /> High Availability Node
            </Badge>
          </CardHeader>
          <CardContent className="h-[400px] pt-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#264D73" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#264D73" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#67D0E4" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#67D0E4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                <Area name="Revenue (XAF)" type="monotone" dataKey="revenue" stroke="#264D73" strokeWidth={4} fill="url(#colorRev)" />
                <Area name="Active Users" type="monotone" dataKey="users" stroke="#67D0E4" strokeWidth={4} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white flex flex-col">
          <CardHeader className="bg-primary p-8 text-white">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <PieChart className="w-5 h-5 text-secondary" />
              User Segment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={userDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={80} />
                <RechartsTooltip />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {userDistribution.map((segment, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-accent/20 border border-accent">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="text-xs font-bold text-primary">{segment.name}</span>
                  </div>
                  <span className="text-sm font-black">{segment.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
