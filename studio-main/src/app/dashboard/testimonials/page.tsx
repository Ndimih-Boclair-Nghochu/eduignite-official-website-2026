
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Quote,
  CheckCircle2,
  Trash2,
  Clock,
  Building2,
  User,
  Loader2,
  ShieldCheck,
  Search,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// API Hooks
const useTestimonies = () => {
  return useQuery({
    queryKey: ["testimonies"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/testimonies`);
      return data;
    },
    initialData: [],
  });
};

const usePendingTestimonies = () => {
  return useQuery({
    queryKey: ["pending-testimonies"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/testimonies/pending`);
      return data;
    },
    initialData: [],
  });
};

const useApproveTestimony = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/testimonies/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonies"] });
      queryClient.invalidateQueries({ queryKey: ["pending-testimonies"] });
    },
  });
};

const useRejectTestimony = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/testimonies/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonies"] });
      queryClient.invalidateQueries({ queryKey: ["pending-testimonies"] });
    },
  });
};

export default function TestimonyManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const isSuperAdmin = user?.role && ["SUPER_ADMIN", "CEO", "CTO", "INV", "Investor"].includes(user.role);

  const { data: testimonies = [] } = useTestimonies();
  const { data: pendingTestimonies = [] } = usePendingTestimonies();
  const approveTestimonyMutation = useApproveTestimony();
  const rejectTestimonyMutation = useRejectTestimony();

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 bg-red-50 rounded-full border-2 border-dashed border-red-200">
          <AlertCircle className="w-16 h-16 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-primary uppercase">Unauthorized Access</h1>
          <p className="text-muted-foreground max-w-md">Only platform executives are authorized to moderate community testimonies.</p>
        </div>
        <Button asChild className="rounded-xl px-10"><Link href="/dashboard">Return to Dashboard</Link></Button>
      </div>
    );
  }

  // Filter pending items
  const filteredPending = (pendingTestimonies || []).filter((e: any) =>
    (e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApprove = async (id: string) => {
    try {
      await approveTestimonyMutation.mutateAsync(id);
      toast({ title: "Testimony Approved", description: "This message is now live on public portals." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to approve testimony" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await rejectTestimonyMutation.mutateAsync(id);
      toast({ variant: "destructive", title: "Testimony Removed" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete testimony" });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg text-white">
              <Quote className="w-6 h-6 text-secondary" />
            </div>
            Testimony Moderation (Prototype)
          </h1>
          <p className="text-muted-foreground mt-1">Review and approve user stories for the public community portal.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase tracking-widest">
            {filteredPending.length} Pending Submissions
          </Badge>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by name or school..." 
          className="pl-10 h-12 bg-white border-none rounded-xl shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredPending.map((entry: any) => (
          <Card key={entry.id} className="border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-72 bg-accent/20 border-r p-6 flex flex-col items-center text-center space-y-4 shrink-0">
                <Avatar className="h-24 w-24 border-4 border-white shadow-2xl">
                  <AvatarImage src={entry.profileImage} />
                  <AvatarFallback className="bg-primary text-white text-2xl font-bold">{entry.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-black text-primary text-sm uppercase leading-tight">{entry.name}</h3>
                  <Badge variant="secondary" className="bg-secondary/20 text-primary border-none text-[8px] h-4 uppercase px-2">{entry.role}</Badge>
                </div>
                <div className="pt-4 border-t border-accent/50 w-full space-y-2">
                  <div className="flex items-center justify-center gap-2 text-primary/60">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold truncate">{entry.schoolName}</span>
                  </div>
                  <Badge className="w-full justify-center py-1 font-black uppercase text-[9px] bg-amber-100 text-amber-700 border-none">
                    <Clock className="w-3 h-3 mr-1" /> PENDING REVIEW
                  </Badge>
                </div>
              </div>

              <div className="flex-1 p-6 md:p-8 flex flex-col">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2 border-b border-accent pb-4">
                    <MessageSquare className="w-4 h-4 text-primary/40" />
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Shared Testimony</h4>
                  </div>
                  
                  <div className="bg-white/50 border border-accent rounded-2xl p-6 italic text-lg text-primary/80 leading-relaxed font-medium">
                    "{entry.message}"
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
                    <span className="text-[10px] font-black text-muted-foreground tracking-widest italic">Verified Account Record</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" className="flex-1 sm:flex-none text-destructive hover:bg-red-50 gap-2 h-11 px-6 rounded-xl" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                    <Button className="flex-1 sm:flex-none gap-2 h-11 px-8 rounded-xl shadow-lg" onClick={() => handleApprove(entry.id)}>
                      <CheckCircle2 className="w-4 h-4" /> Approve for Public
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredPending.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/50 rounded-[2rem] border-2 border-dashed border-primary/10">
            <Quote className="w-16 h-16 text-primary/10" />
            <p className="text-muted-foreground font-medium">No pending testimonies require moderation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
