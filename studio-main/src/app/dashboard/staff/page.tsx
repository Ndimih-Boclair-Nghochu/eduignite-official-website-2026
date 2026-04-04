"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// API Hooks
const useUsers = (params: any) => {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, { params });
      return data;
    },
    initialData: [],
  });
};

const useStaffRemarks = (params: any) => {
  return useQuery({
    queryKey: ["remarks", params],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/remarks`, { params });
      return data;
    },
    initialData: [],
  });
};

const useMyRemarks = () => {
  return useQuery({
    queryKey: ["my-remarks"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/remarks/me`);
      return data;
    },
    initialData: [],
  });
};

const useCreateRemark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (remark: any) => {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/remarks`, remark);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remarks"] });
    },
  });
};

const useAcknowledgeRemark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (remarkId: string) => {
      const { data } = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/remarks/${remarkId}/acknowledge`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remarks"] });
      queryClient.invalidateQueries({ queryKey: ["my-remarks"] });
    },
  });
};

const REMARK_TYPES = [
  { value: "Commendation", label: "Commendation", color: "bg-green-100 text-green-700" },
  { value: "Warning", label: "Warning", color: "bg-amber-100 text-amber-700" },
  { value: "Suspension", label: "Suspension", color: "bg-red-100 text-red-700" },
  { value: "Praise", label: "Praise", color: "bg-blue-100 text-blue-700" },
];

export default function StaffPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isRemarkDialogOpen, setIsRemarkDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newRemark, setNewRemark] = useState({
    staffId: "",
    type: "Commendation",
    message: "",
  });

  const isAdmin = ["SCHOOL_ADMIN", "SUB_ADMIN"].includes(user?.role || "");

  // Fetch staff list
  const { data: staffList = [] } = useUsers({
    role: "TEACHER,BURSAR,LIBRARIAN,SUB_ADMIN",
  });

  // Fetch remarks
  const { data: remarksList = [] } = useStaffRemarks({
    search: searchTerm,
  });

  const { data: myRemarks = [] } = useMyRemarks();

  const createRemarkMutation = useCreateRemark();
  const acknowledgeRemarkMutation = useAcknowledgeRemark();

  const filteredStaff = staffList.filter((s: any) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRemark = async () => {
    if (!newRemark.staffId || !newRemark.message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill all fields",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await createRemarkMutation.mutateAsync(newRemark);
      setIsProcessing(false);
      setIsRemarkDialogOpen(false);
      setNewRemark({ staffId: "", type: "Commendation", message: "" });
      toast({ title: "Remark Created", description: "Staff member has been notified." });
    } catch (error) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Error", description: "Failed to create remark" });
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeRemarkMutation.mutateAsync(id);
      toast({ title: "Acknowledged", description: "Remark has been acknowledged." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to acknowledge." });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg text-white">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage faculty, remarks, and institutional staff.</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full md:w-[400px] mb-8 bg-white shadow-sm border h-auto p-1.5 rounded-3xl grid-cols-2">
          <TabsTrigger value="list" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
            <Users className="w-4 h-4" /> Staff List
          </TabsTrigger>
          <TabsTrigger value="remarks" className="gap-2 py-3 rounded-2xl transition-all font-bold text-xs sm:text-sm">
            <MessageSquare className="w-4 h-4" /> Remarks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
            <Search className="w-4 h-4 text-muted-foreground ml-2" />
            <Input
              placeholder="Search staff by name or ID..."
              className="border-none bg-transparent focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStaff.map((staff: any) => (
              <Card key={staff.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white rounded-[2rem] overflow-hidden group">
                <CardHeader className="flex flex-row items-center gap-4 pb-6">
                  <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/10 shadow-lg shrink-0">
                    <AvatarImage src={staff.avatar} alt={staff.name} />
                    <AvatarFallback className="bg-primary text-white font-black text-xl">{staff.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden flex-1">
                    <CardTitle className="text-lg font-black text-primary leading-tight uppercase truncate">{staff.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-[8px] h-5 border-primary/10 text-primary font-bold uppercase">
                      {staff.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="py-6 border-y border-accent/50 space-y-3 bg-accent/5">
                  <p className="text-[10px] font-bold text-muted-foreground">{staff.email}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{staff.phone}</p>
                </CardContent>

                <div className="p-4 flex justify-between items-center">
                  <Badge className="bg-green-100 text-green-700 text-[8px] h-5 font-black border-none">Active</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="remarks" className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {isAdmin ? (
              remarksList.map((remark: any) => (
                <Card key={remark.id} className="border-none shadow-xl overflow-hidden bg-white rounded-[2rem] group hover:shadow-2xl transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-72 bg-accent/20 border-r p-6 flex flex-col items-center text-center space-y-4 shrink-0">
                      <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                        <AvatarImage src={remark.staffAvatar} />
                        <AvatarFallback className="bg-primary text-white text-2xl font-bold">{remark.staffName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="font-black text-primary text-sm uppercase leading-tight">{remark.staffName}</h3>
                      </div>
                      <Badge className={cn("w-full justify-center py-1 font-black uppercase text-[9px]", REMARK_TYPES.find(t => t.value === remark.type)?.color || "bg-gray-100 text-gray-700")}>
                        {remark.type}
                      </Badge>
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col">
                      <div className="bg-white/50 border border-accent rounded-2xl p-6 italic text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                        "{remark.message}"
                      </div>
                      <div className="pt-4 border-t flex justify-between items-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <Clock className="w-3 h-3 inline mr-1" /> {new Date(remark.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              myRemarks.map((remark: any) => (
                <Card key={remark.id} className="border-none shadow-xl overflow-hidden bg-white rounded-[2rem] group hover:shadow-2xl transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-72 bg-accent/20 border-r p-6 flex flex-col items-center text-center space-y-4 shrink-0">
                      <div className="p-3 bg-primary rounded-xl text-white">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <Badge className={cn("w-full justify-center py-1 font-black uppercase text-[9px]", REMARK_TYPES.find(t => t.value === remark.type)?.color || "bg-gray-100 text-gray-700")}>
                        {remark.type}
                      </Badge>
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col">
                      <div className="bg-white/50 border border-accent rounded-2xl p-6 italic text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                        "{remark.message}"
                      </div>
                      <div className="pt-4 border-t flex justify-between items-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <Clock className="w-3 h-3 inline mr-1" /> {new Date(remark.createdAt).toLocaleString()}
                        </span>
                        <Button
                          className="gap-2 shadow-lg"
                          onClick={() => handleAcknowledge(remark.id)}
                          disabled={remark.acknowledged}
                        >
                          <CheckCircle2 className="w-4 h-4" /> {remark.acknowledged ? "Acknowledged" : "Acknowledge"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
