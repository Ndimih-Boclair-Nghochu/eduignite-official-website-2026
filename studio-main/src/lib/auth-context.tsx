"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/api/services/auth.service";
import { usersService } from "@/lib/api/services/users.service";
import { setTokens, clearTokens } from "@/lib/api/client";
import type { User as ApiUser, UserRole as ApiUserRole } from "@/lib/api/types";

export type UserRole = "SUPER_ADMIN" | "CEO" | "CTO" | "COO" | "INV" | "DESIGNER" | "SCHOOL_ADMIN" | "SUB_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "BURSAR" | "LIBRARIAN";

export interface SchoolInfo {
  id: string;
  name: string;
  shortName: string;
  principal: string;
  motto: string;
  logo: string;
  banner: string;
  description: string;
  location: string;
  region: string;
  division: string;
  subDivision: string;
  cityVillage: string;
  address: string;
  postalCode?: string;
  phone: string;
  email: string;
  status: string;
}

export interface PlatformFees {
  STUDENT: string;
  PARENT: string;
  TEACHER: string;
  BURSAR: string;
  LIBRARIAN: string;
  SCHOOL_ADMIN: string;
  SUB_ADMIN: string;
}

export interface TutorialLinks {
  STUDENT: string;
  TEACHER: string;
  PARENT: string;
  SCHOOL_ADMIN: string;
  SUB_ADMIN: string;
  BURSAR: string;
  LIBRARIAN: string;
}

interface PlatformSettings {
  name: string;
  logo: string;
  paymentDeadline: string;
  fees: PlatformFees;
  tutorialLinks: TutorialLinks;
  honourRollThreshold: number;
}

export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  schoolId: string | null;
  avatar?: string;
  school?: SchoolInfo;
  isLicensePaid: boolean;
  aiRequestCount?: number;
  annualAvg?: number;
  annual_avg?: number;
}

export interface Testimony {
  id: string;
  userId: string;
  name: string;
  profileImage: string;
  role: string;
  schoolName: string;
  message: string;
  status: "pending" | "approved";
  createdAt: Date;
}

export interface CommunityBlog {
  id: string;
  title: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  image?: string;
  paragraphs: string[];
  createdAt: Date;
}

export interface Feedback {
  id: string;
  subject: string;
  message: string;
  schoolName: string;
  schoolId: string;
  schoolLogo: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  status: "New" | "Resolved";
  createdAt: Date;
}

export interface Order {
  id: string;
  fullName: string;
  occupation: string;
  schoolName: string;
  whatsappNumber: string;
  email: string;
  region: string;
  division: string;
  subDivision: string;
  status: "pending" | "processed";
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target: string;
  targetUid?: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  createdAt: Date;
  senderUid: string;
}

export interface SupportContribution {
  id: string;
  uid: string;
  userName: string;
  userRole: string;
  userAvatar: string;
  schoolName: string;
  amount: number;
  method: string;
  phone: string;
  message: string;
  status: "New" | "Verified";
  createdAt: Date;
}

export interface PersonalChat {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isOfficial: boolean;
}

export interface PublicEvent {
  id: string;
  type: "video" | "image";
  title: string;
  description: string;
  url: string;
}

export interface StaffRemark {
  id: string;
  staffId: string;
  adminName: string;
  text: string;
  date: string;
}

interface AuthContextType {
  user: User | null;
  platformSettings: PlatformSettings;
  testimonials: Testimony[];
  communityBlogs: CommunityBlog[];
  feedbacks: Feedback[];
  orders: Order[];
  announcements: Announcement[];
  supportContributions: SupportContribution[];
  personalChats: PersonalChat[];
  schools: SchoolInfo[];
  publicEvents: PublicEvent[];
  staffRemarks: StaffRemark[];
  login: (matricule: string, password: string) => Promise<void>;
  activateAccount: (matricule: string, password: string, confirmPassword: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateSchool: (updates: Partial<SchoolInfo>) => Promise<void>;
  updatePlatformSettings: (updates: Partial<PlatformSettings>) => Promise<void>;
  markLicensePaid: () => Promise<void>;
  incrementAiRequest: () => Promise<void>;
  addTestimony: (testimony: Omit<Testimony, "id" | "status" | "createdAt">) => void;
  approveTestimony: (id: string) => void;
  deleteTestimony: (id: string) => void;
  addCommunityBlog: (blog: Omit<CommunityBlog, "id" | "createdAt">) => void;
  deleteCommunityBlog: (id: string) => void;
  addFeedback: (feedback: Omit<Feedback, "id" | "status" | "createdAt">) => void;
  resolveFeedback: (id: string) => void;
  deleteFeedback: (id: string) => void;
  addOrder: (order: Omit<Order, "id" | "status" | "createdAt">) => void;
  processOrder: (id: string) => void;
  deleteOrder: (id: string) => void;
  addAnnouncement: (ann: Omit<Announcement, "id" | "createdAt">) => void;
  deleteAnnouncement: (id: string) => void;
  addSchool: (school: Omit<SchoolInfo, "status">) => void;
  toggleSchoolStatus: (id: string) => void;
  deleteSchool: (id: string) => void;
  addSupport: (contribution: Omit<SupportContribution, "id" | "status" | "createdAt">) => void;
  verifySupport: (id: string) => void;
  deleteSupport: (id: string) => void;
  addPublicEvent: (event: Omit<PublicEvent, "id">) => void;
  deletePublicEvent: (id: string) => void;
  addStaffRemark: (remark: Omit<StaffRemark, "id" | "date">) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_FEES: PlatformFees = {
  STUDENT: "5000",
  PARENT: "2500",
  TEACHER: "10000",
  BURSAR: "10000",
  LIBRARIAN: "10000",
  SCHOOL_ADMIN: "25000",
  SUB_ADMIN: "15000",
};

const DEFAULT_TUTORIALS: TutorialLinks = {
  STUDENT: "",
  TEACHER: "",
  PARENT: "",
  SCHOOL_ADMIN: "",
  SUB_ADMIN: "",
  BURSAR: "",
  LIBRARIAN: "",
};

const PLATFORM_DEFAULTS: PlatformSettings = {
  name: "EduIgnite",
  logo: "",
  paymentDeadline: "",
  fees: DEFAULT_FEES,
  tutorialLinks: DEFAULT_TUTORIALS,
  honourRollThreshold: 15.0,
};

const mapSchoolInfo = (school: any): SchoolInfo | undefined => {
  if (!school) return undefined;
  return {
    id: school.id ?? "",
    name: school.name ?? "",
    shortName: school.shortName ?? school.short_name ?? "",
    principal: school.principal ?? "",
    motto: school.motto ?? "",
    logo: school.logo ?? "",
    banner: school.banner ?? "",
    description: school.description ?? "",
    location: school.location ?? "",
    region: school.region ?? "",
    division: school.division ?? "",
    subDivision: school.subDivision ?? school.sub_division ?? "",
    cityVillage: school.cityVillage ?? school.city_village ?? "",
    address: school.address ?? "",
    postalCode: school.postalCode ?? school.postal_code,
    phone: school.phone ?? "",
    email: school.email ?? "",
    status: school.status ?? "",
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [testimonials, setTestimonials] = useState<Testimony[]>([]);
  const [communityBlogs, setCommunityBlogs] = useState<CommunityBlog[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [personalChats, setPersonalChats] = useState<PersonalChat[]>([]);
  const [supportContributions, setSupportContributions] = useState<SupportContribution[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  const [staffRemarks, setStaffRemarks] = useState<StaffRemark[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(PLATFORM_DEFAULTS);

  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken =
        localStorage.getItem("eduignite_access_token") || localStorage.getItem("access_token");
      if (accessToken) {
        try {
          const user = await authService.getCurrentUser();
          if (user) {
            const mappedUser: User = {
              id: user.id || "",
              uid: user.uid || `user_${user.id}`,
              name: user.name || "",
              email: user.email || "",
              phone: user.phone,
              whatsapp: user.whatsapp,
              role: (user.role as UserRole) || "STUDENT",
              schoolId: user.schoolId || null,
              avatar: user.avatar,
              school: mapSchoolInfo(user.school),
              isLicensePaid: user.isLicensePaid || false,
              aiRequestCount: user.aiRequestCount,
              annualAvg: user.annualAvg,
            };
            setUserData(mappedUser);
          }
        } catch (error: any) {
          if (error.response?.status === 401) {
            try {
              await authService.refreshToken();
              const user = await authService.getCurrentUser();
              if (user) {
                const mappedUser: User = {
                  id: user.id || "",
                  uid: user.uid || `user_${user.id}`,
                  name: user.name || "",
                  email: user.email || "",
                  phone: user.phone,
                  whatsapp: user.whatsapp,
                  role: (user.role as UserRole) || "STUDENT",
                  schoolId: user.schoolId || null,
                  avatar: user.avatar,
              school: mapSchoolInfo(user.school),
                  isLicensePaid: user.isLicensePaid || false,
                  aiRequestCount: user.aiRequestCount,
                  annualAvg: user.annualAvg,
                };
                setUserData(mappedUser);
              }
            } catch (refreshError) {
              clearTokens();
              setUserData(null);
            }
          } else {
            clearTokens();
            setUserData(null);
          }
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (matricule: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(matricule, password);
      if (response.access && response.refresh) {
        setTokens(response.access, response.refresh);
      }

      const user = await authService.getCurrentUser();
      if (user) {
        const mappedUser: User = {
          id: user.id || "",
          uid: user.uid || `user_${user.id}`,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone,
          whatsapp: user.whatsapp,
          role: (user.role as UserRole) || "STUDENT",
          schoolId: user.schoolId || null,
          avatar: user.avatar,
          school: mapSchoolInfo(user.school),
          isLicensePaid: user.isLicensePaid || false,
          aiRequestCount: user.aiRequestCount,
          annualAvg: user.annualAvg,
        };
        setUserData(mappedUser);

        const boardRoles = ["CEO", "CTO", "COO", "INV", "SUPER_ADMIN", "DESIGNER"];
        router.push(boardRoles.includes(mappedUser.role) ? "/dashboard" : "/welcome");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activateAccount = async (matricule: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    try {
      await authService.activateAccount(matricule, password, confirmPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!userData) return;
    try {
      await usersService.updateProfile(updates);
      const newUser = { ...userData, ...updates };
      setUserData(newUser);
    } catch (error) {
      console.error("Failed to update user", error);
      throw error;
    }
  };

  const updateSchool = async (updates: Partial<SchoolInfo>) => {
    if (!userData || !userData.school) return;
    const updated = { ...userData.school, ...updates };
    setSchools((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    await updateUser({ school: updated });
  };

  const updatePlatformSettings = async (updates: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...updates }));
  };

  const markLicensePaid = async () => await updateUser({ isLicensePaid: true });
  const incrementAiRequest = async () => {
    if (!userData) return;
    await updateUser({ aiRequestCount: (userData.aiRequestCount || 0) + 1 });
  };

  const addTestimony = (t: Omit<Testimony, "id" | "status" | "createdAt">) =>
    setTestimonials((prev) => [
      {
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        status: "pending",
        createdAt: new Date(),
      },
      ...prev,
    ]);
  const approveTestimony = (id: string) =>
    setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, status: "approved" } : t)));
  const deleteTestimony = (id: string) =>
    setTestimonials((prev) => prev.filter((t) => t.id !== id));

  const addCommunityBlog = (b: Omit<CommunityBlog, "id" | "createdAt">) =>
    setCommunityBlogs((prev) => [
      { ...b, id: `BLOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, createdAt: new Date() },
      ...prev,
    ]);
  const deleteCommunityBlog = (id: string) =>
    setCommunityBlogs((prev) => prev.filter((b) => b.id !== id));

  const addFeedback = (f: Omit<Feedback, "id" | "status" | "createdAt">) =>
    setFeedbacks((prev) => [
      { ...f, id: `FB-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, status: "New", createdAt: new Date() },
      ...prev,
    ]);
  const resolveFeedback = (id: string) =>
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status: "Resolved" } : f)));
  const deleteFeedback = (id: string) => setFeedbacks((prev) => prev.filter((f) => f.id !== id));

  const addOrder = (o: Omit<Order, "id" | "status" | "createdAt">) =>
    setOrders((prev) => [
      { ...o, id: `ORD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, status: "pending", createdAt: new Date() },
      ...prev,
    ]);
  const processOrder = (id: string) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "processed" } : o)));
  const deleteOrder = (id: string) => setOrders((prev) => prev.filter((o) => o.id !== id));

  const addAnnouncement = (a: Omit<Announcement, "id" | "createdAt">) =>
    setAnnouncements((prev) => [
      { ...a, id: Math.random().toString(), createdAt: new Date() },
      ...prev,
    ]);
  const deleteAnnouncement = (id: string) =>
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

  const addSchool = (s: Omit<SchoolInfo, "status">) =>
    setSchools((prev) => [{ ...s, status: "Active" }, ...prev]);
  const toggleSchoolStatus = (id: string) =>
    setSchools((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === "Active" ? "Suspended" : "Active" } : s
      )
    );
  const deleteSchool = (id: string) => setSchools((prev) => prev.filter((s) => s.id !== id));

  const addSupport = (c: Omit<SupportContribution, "id" | "status" | "createdAt">) =>
    setSupportContributions((prev) => [
      {
        ...c,
        id: `SUP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        status: "New",
        createdAt: new Date(),
      },
      ...prev,
    ]);
  const verifySupport = (id: string) => {
    setSupportContributions((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          setPersonalChats((pc) => [
            ...pc,
            {
              id: `MSG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              senderId: "system",
              senderName: "Platform Team",
              senderRole: "SYSTEM",
              senderAvatar: "",
              receiverId: c.uid,
              text: `Hello ${c.userName}, your contribution has been verified.`,
              timestamp: new Date().toLocaleTimeString(),
              isOfficial: true,
            },
          ]);
          return { ...c, status: "Verified" };
        }
        return c;
      })
    );
  };
  const deleteSupport = (id: string) =>
    setSupportContributions((prev) => prev.filter((c) => c.id !== id));

  const addPublicEvent = (e: Omit<PublicEvent, "id">) =>
    setPublicEvents((prev) => [
      { ...e, id: `EVT-${Math.random().toString(36).substr(2, 5).toUpperCase()}` },
      ...prev,
    ]);
  const deletePublicEvent = (id: string) =>
    setPublicEvents((prev) => prev.filter((e) => e.id !== id));

  const addStaffRemark = (r: Omit<StaffRemark, "id" | "date">) => {
    setStaffRemarks((prev) => [
      {
        ...r,
        id: `REM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        date: new Date().toLocaleDateString(),
      },
      ...prev,
    ]);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error (continuing)", error);
    } finally {
      clearTokens();
      setUserData(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: userData,
        platformSettings,
        testimonials,
        communityBlogs,
        feedbacks,
        orders,
        announcements,
        personalChats,
        supportContributions,
        schools,
        publicEvents,
        staffRemarks,
        login,
        activateAccount,
        updateUser,
        updateSchool,
        updatePlatformSettings,
        markLicensePaid,
        incrementAiRequest,
        addTestimony,
        approveTestimony,
        deleteTestimony,
        addCommunityBlog,
        deleteCommunityBlog,
        addFeedback,
        resolveFeedback,
        deleteFeedback,
        addOrder,
        processOrder,
        deleteOrder,
        addAnnouncement,
        deleteAnnouncement,
        addSchool,
        toggleSchoolStatus,
        deleteSchool,
        addSupport,
        verifySupport,
        deleteSupport,
        addPublicEvent,
        deletePublicEvent,
        addStaffRemark,
        logout,
        isAuthenticated: !!userData,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
