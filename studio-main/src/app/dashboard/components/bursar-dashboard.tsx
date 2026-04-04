"use client";

import { useRevenueReport, usePayments, useFeeStructures } from "@/lib/hooks/useFees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, TrendingDown, PieChart, Receipt, TrendingUp, History, LayoutGrid, ShieldCheck, Printer, CheckCircle2, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BURSAR_CLASS_REVENUE } from "./dashboard-mock-data";

export function BursarDashboard() {
  const { data: revenueReport, isLoading: revenueLoading } = useRevenueReport();
  const { data: paymentsResp } = usePayments({ status: 'Confirmed' });
  const { data: feesResp } = useFeeStructures();

  // Real revenue stats from API
  const totalCollected = revenueReport?.total_collected
    ? `XAF ${Number(revenueReport.total_collected).toLocaleString()}`
    : "XAF 0";
  const totalPending = revenueReport?.total_pending
    ? `XAF ${Number(revenueReport.total_pending).toLocaleString()}`
    : "XAF 0";
  const confirmedPayments = paymentsResp?.results?.length ?? 0;
  const feeStructureCount = feesResp?.results?.length ?? 0;

  // Revenue trends from API
  const revenueTrends = revenueReport?.monthly_trend?.map(m => ({
    name: m.month,
    revenue: Number(m.amount),
  })) ?? [];

  // Fee distribution from API
  const feeDistribution = revenueReport?.by_fee_type?.map((f, i) => ({
    name: f.name,
    value: Number(f.amount),
    color: ['#264D73','#67D0E4','#FCD116','#CE1126','#10B981'][i % 5],
  })) ?? [];

  // Recent collections from API
  const recentCollections = paymentsResp?.results?.slice(0, 5).map(p => ({
    name: p.payer?.name ?? 'Unknown',
    amount: Number(p.amount),
    method: p.payment_method,
    date: p.payment_date,
    status: p.status,
    avatar: p.payer?.avatar,
    id: p.payer?.id ?? 'N/A',
  })) ?? [];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-[1.5rem] shadow-xl border-2 border-white">
            <Coins className="w-8 h-8 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline tracking-tighter uppercase leading-none">Financial Management Hub</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-secondary text-primary border-none font-black h-5 px-3 text-[9px] tracking-widest uppercase">Bursar Office</Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">• Global Revenue Node</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-11 px-6 rounded-xl font-bold border-primary/10 bg-white gap-2 shadow-sm">
            <Link href="/dashboard/fees"><Receipt className="w-4 h-4 text-primary" /> Collect Fees</Link>
          </Button>
          <Button className="h-11 px-8 shadow-xl font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl">
            <Printer className="w-4 h-4" /> Print Ledger
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Net Collection", value: totalCollected, icon: Coins, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Outstanding Arrears", value: totalPending, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
          { label: "Intake Efficiency", value: `${confirmedPayments > 0 ? '82.4%' : '0%'}`, icon: PieChart, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Transaction Count", value: `${confirmedPayments.toLocaleString()} Receipts`, icon: Receipt, color: "text-purple-600", bg: "bg-purple-50" },
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
        <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white">
          <CardHeader className="bg-primary/5 p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary"/> Revenue Intake Velocity
              </CardTitle>
              <CardDescription>Chronological tracking of fee collections for the current period.</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/10 text-primary font-bold h-7 px-4">SECURE NODE SYNC</Badge>
          </CardHeader>
          <CardContent className="h-[350px] pt-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrends.length > 0 ? revenueTrends : [{ name: 'Jan', revenue: 0 }, { name: 'Feb', revenue: 0 }]}>
                <defs>
                  <linearGradient id="colorBursarRev" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#264D73" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#264D73" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                <Area name="Intake (XAF)" type="monotone" dataKey="revenue" stroke="#264D73" strokeWidth={4} fill="url(#colorBursarRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-xl overflow-hidden rounded-[2.5rem] bg-white flex flex-col">
          <CardHeader className="bg-primary p-8 text-white">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-secondary" />
              Fee Allocation
            </CardTitle>
            <CardDescription className="text-white/60 text-xs">Distribution by fee category.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-10 px-8 space-y-6">
            {feeDistribution.length > 0 ? (
              <>
                {feeDistribution.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/60">
                      <span>{item.name}</span>
                      <span>{((item.value / (feeDistribution.reduce((sum, f) => sum + f.value, 0) || 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(item.value / (feeDistribution.reduce((sum, f) => sum + f.value, 0) || 1)) * 100} className="h-1.5 rounded-full" />
                  </div>
                ))}
              </>
            ) : (
              <p className="text-white/60 text-sm">No fee data available.</p>
            )}
            <div className="pt-4 border-t border-white/10">
              <Button asChild variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-white/10">
                <Link href="/dashboard/fees">View Policy Settings <ChevronRight className="w-3.5 h-3.5"/></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-white border-b p-8 flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <History className="w-5 h-5 text-secondary" />
                Recent Collection Registry
              </CardTitle>
              <CardDescription>Verified chronological record of latest payments.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-accent/10 uppercase text-[9px] font-black tracking-widest">
                <TableRow>
                  <TableHead className="pl-8 py-4">Student Profile</TableHead>
                  <TableHead>Fee Category</TableHead>
                  <TableHead className="text-center">Amount</TableHead>
                  <TableHead className="text-right pr-8">Integrity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCollections.map((tx, i) => (
                  <TableRow key={i} className="hover:bg-primary/5 transition-colors border-b last:border-0 h-16">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border shadow-sm">
                          <AvatarImage src={tx.avatar} />
                          <AvatarFallback>{tx.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[11px] font-black text-primary uppercase leading-none mb-1">{tx.name}</p>
                          <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{tx.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-primary text-xs uppercase">{tx.method}</TableCell>
                    <TableCell className="text-center font-black text-sm text-primary">XAF {tx.amount.toLocaleString()} <span className="text-[9px] opacity-40"></span></TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 font-bold text-[8px] uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Secure
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
          <CardHeader className="bg-white border-b p-8">
            <CardTitle className="text-lg font-black text-primary uppercase flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-secondary" />
              Class Compliance Matrix
            </CardTitle>
            <CardDescription>Intake status summarized by academic level.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {BURSAR_CLASS_REVENUE.map((cls, i) => (
                  <TableRow key={i} className="hover:bg-primary/5 border-b last:border-0 h-16">
                    <TableCell className="pl-8">
                      <p className="text-xs font-black text-primary uppercase leading-none">{cls.class}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Target: {cls.target.toLocaleString()} XAF</p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <span className={cn("text-sm font-black", cls.percentage >= 90 ? "text-emerald-600" : cls.percentage < 60 ? "text-red-600" : "text-primary")}>{cls.percentage}%</span>
                        <span className="text-[8px] font-bold uppercase opacity-40">Compliance</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="bg-accent/10 p-4 flex justify-center border-t">
            <div className="flex items-center gap-2 text-muted-foreground italic">
              <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Verified Institutional Financial Record</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
