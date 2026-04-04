
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Coins,
  Building2,
  Clock,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Loader2,
  Package,
  MapPin,
  Mail,
  Phone,
  Globe,
  User,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// API Hooks
const useSupportContributions = () => {
  return useQuery({
    queryKey: ["support-contributions"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/support-contributions`);
      return data;
    },
    initialData: [],
  });
};

const useCreateSupport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (support: any) => {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/support-contributions`, support);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-contributions"] });
    },
  });
};

const useVerifySupport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/support-contributions/${id}/verify`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-contributions"] });
    },
  });
};

const useSupportStats = () => {
  return useQuery({
    queryKey: ["support-stats"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/support-contributions/stats`);
      return data;
    },
    initialData: {},
  });
};

export default function SupportLedgerPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = ["SUPER_ADMIN", "CEO", "CTO", "COO"].includes(user?.role || "");

  const { data: supportContributions = [] } = useSupportContributions();
  const { data: supportStats = {} } = useSupportStats();
  const verifySupportMutation = useVerifySupport();

  const handleVerifyContribution = async (id: string) => {
    try {
      await verifySupportMutation.mutateAsync(id);
      toast({ title: "Contribution Verified", description: "An official appreciation message has been dispatched." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to verify contribution" });
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg text-white">
              <Heart className="w-6 h-6 text-secondary fill-secondary/20" />
            </div>
            Support & Orders
          </h1>
          <p className="text-muted-foreground mt-1">Manage platform onboarding orders and community contributions.</p>
        </div>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid grid-cols-2 w-full md:w-[400px] mb-8 bg-white shadow-sm border h-auto p-1 rounded-2xl">
          <TabsTrigger value="orders" className="gap-2 py-3 rounded-xl transition-all">
            <Package className="w-4 h-4" /> Platform Orders
          </TabsTrigger>
          <TabsTrigger value="contributions" className="gap-2 py-3 rounded-xl transition-all">
            <Coins className="w-4 h-4" /> Contributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-0 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/50 rounded-[2rem] border-2 border-dashed border-primary/10">
            <Package className="w-16 h-16 text-primary/10" />
            <p className="text-muted-foreground">No onboarding orders found in the registry.</p>
          </div>
        </TabsContent>

        <TabsContent value="contributions" className="mt-0">
          <div className="grid grid-cols-1 gap-6">
            {supportContributions.map((entry: any) => (
              <Card key={entry.id} className="border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-72 bg-accent/20 border-r p-6 flex flex-col items-center text-center space-y-4 shrink-0">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-2xl">
                      <AvatarImage src={entry.userAvatar} />
                      <AvatarFallback className="bg-primary text-white text-2xl font-bold">{entry.userName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="font-black text-primary text-sm uppercase leading-tight">{entry.userName}</h3>
                      <Badge variant="secondary" className="bg-secondary/20 text-primary border-none text-[8px] h-4 uppercase px-2">{entry.userRole}</Badge>
                    </div>
                    <div className="space-y-1 pt-2">
                       <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Associated Node</p>
                       <div className="flex items-center justify-center gap-1 text-primary/60">
                          <Building2 className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{entry.schoolName}</span>
                       </div>
                    </div>
                    <div className="pt-4 border-t border-accent/50 w-full">
                      <Badge className={cn(
                        "w-full justify-center py-1 font-black uppercase text-[9px]",
                        entry.status === 'Verified' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {entry.status === 'Verified' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {entry.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1 p-6 md:p-8 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-8">
                      <div className="grid grid-cols-2 gap-8 flex-1">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Coins className="w-3 h-3 text-secondary" /> Contribution</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-primary">{entry.amount?.toLocaleString()}</span>
                            <span className="text-xs font-bold text-muted-foreground">XAF</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Smartphone className="w-3 h-3 text-secondary" /> Method</p>
                          <Badge variant="outline" className="h-7 px-3 bg-white text-primary font-black uppercase text-[10px]">{entry.method}</Badge>
                          <p className="text-[10px] font-mono font-bold text-muted-foreground mt-1">{entry.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/50 border border-accent rounded-2xl p-6 italic text-sm text-muted-foreground leading-relaxed flex-1">
                      "{entry.message || "No message provided."}"
                    </div>

                    <div className="mt-8 pt-6 border-t flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary/40" /> Received: {new Date(entry.createdAt).toLocaleString()}
                      </span>
                      <Button className="gap-2 shadow-lg" onClick={() => handleVerifyContribution(entry.id)} disabled={entry.status === 'Verified'}>
                        <CheckCircle2 className="w-4 h-4" /> {entry.status === 'Verified' ? 'Appreciation Sent' : 'Verify & Appreciate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {(!supportContributions || supportContributions.length === 0) && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/50 rounded-[2rem] border-2 border-dashed border-primary/10">
                <Heart className="w-16 h-16 text-primary/10" />
                <p className="text-muted-foreground">No contributions found in the ledger.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
