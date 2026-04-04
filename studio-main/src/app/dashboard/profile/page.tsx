"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Lock, Save, Loader2, Mail, RefreshCw, Smartphone, MessageCircle } from "lucide-react";

// API Hooks
const useMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`);
      return data;
    },
  });
};

const useUpdateProfile = () => {
  return useMutation({
    mutationFn: async (profile: any) => {
      const { data } = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, profile);
      return data;
    },
  });
};

const useChangePassword = () => {
  return useMutation({
    mutationFn: async (passwords: any) => {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/me/change-password`, passwords);
      return data;
    },
  });
};

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const { data: user } = useMe();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || "");

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleUpdateProfile = async () => {
    if (!name || !email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name and email are required.",
      });
      return;
    }

    setLoading(true);
    try {
      await updateProfileMutation.mutateAsync({ name, email, phone, whatsapp });
      setLoading(false);
      toast({
        title: "Changes Saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all password fields.",
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords do not match.",
      });
      return;
    }

    setLoading(true);
    try {
      await changePasswordMutation.mutateAsync(passwords);
      setLoading(false);
      setPasswords({ current: "", new: "", confirm: "" });
      toast({
        title: "Changes Saved",
        description: "Password updated successfully.",
      });
    } catch (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update password",
      });
    }
  };

  const handleChangePhoto = async () => {
    setLoading(true);
    const newSeed = Math.random().toString(36).substring(7);
    const newAvatar = `https://picsum.photos/seed/${newSeed}/200/200`;

    try {
      await updateProfileMutation.mutateAsync({ avatar: newAvatar });
      setLoading(false);
      toast({
        title: "Identity Updated",
        description: "Your profile photo has been refreshed.",
      });
    } catch (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update photo",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary font-headline">Profile</h1>
        <p className="text-muted-foreground mt-1">Edit your profile information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 border-none shadow-sm h-fit bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Identity Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <Avatar className="h-40 w-40 border-4 border-white shadow-2xl ring-1 ring-primary/5">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-primary/5 text-primary text-4xl font-black">
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-2 right-2 rounded-2xl shadow-xl border-2 border-white bg-primary text-white hover:bg-primary/90"
                onClick={handleChangePhoto}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-xl text-primary uppercase tracking-tight leading-none">{user?.name}</p>
              <Badge variant="secondary" className="bg-secondary/20 text-primary border-none text-[10px] font-black uppercase tracking-widest">{user?.role}</Badge>
              <p className="text-xs text-muted-foreground mt-2 font-mono">{user?.id}</p>
            </div>
            <div className="w-full pt-4 border-t space-y-3">
              <p className="text-[10px] text-center font-black uppercase text-muted-foreground tracking-widest">Profile Actions</p>
              <Button variant="outline" className="w-full gap-2 rounded-xl h-11 font-bold border-primary/10" onClick={handleChangePhoto} disabled={loading}>
                <Camera className="w-4 h-4 text-primary" />
                Refresh Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-primary uppercase tracking-tight">
                <User className="w-5 h-5 text-secondary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5" /> Contact Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XX XX XX"
                    className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Contact
                  </Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+237 6XX XX XX XX"
                    className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary font-bold text-secondary"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-accent/5 pt-6">
              <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2 ml-auto h-12 px-8 rounded-xl shadow-lg font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Profile
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-primary uppercase tracking-tight">
                <Lock className="w-5 h-5 text-secondary" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Ensure your account is using a long, random password to stay secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    className="h-12 bg-accent/30 border-none rounded-xl focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-accent/5 pt-6">
              <Button onClick={handleUpdatePassword} disabled={loading || !passwords.new} className="gap-2 ml-auto h-12 px-8 rounded-xl shadow-lg font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
