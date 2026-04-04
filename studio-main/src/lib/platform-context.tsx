"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { SchoolInfo, PlatformFees, TutorialLinks, Testimony, CommunityBlog, PublicEvent } from "./auth-context";

interface PlatformSettings {
  name: string;
  logo: string;
  paymentDeadline: string;
  fees: PlatformFees;
  tutorialLinks: TutorialLinks;
  honourRollThreshold: number;
}

interface PlatformContextType {
  platformSettings: PlatformSettings;
  schools: SchoolInfo[];
  publicEvents: PublicEvent[];
  testimonials: Testimony[];
  communityBlogs: CommunityBlog[];
  updatePlatformSettings: (updates: Partial<PlatformSettings>) => void;
  addSchool: (school: Omit<SchoolInfo, "status">) => void;
  toggleSchoolStatus: (id: string) => void;
  deleteSchool: (id: string) => void;
  addPublicEvent: (event: Omit<PublicEvent, "id">) => void;
  deletePublicEvent: (id: string) => void;
  addTestimony: (testimony: Omit<Testimony, "id" | "status" | "createdAt">) => void;
  approveTestimony: (id: string) => void;
  deleteTestimony: (id: string) => void;
  addCommunityBlog: (blog: Omit<CommunityBlog, "id" | "createdAt">) => void;
  deleteCommunityBlog: (id: string) => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

const DEFAULT_FEES: PlatformFees = {
  STUDENT: "5000", PARENT: "2500", TEACHER: "10000",
  BURSAR: "10000", LIBRARIAN: "10000", SCHOOL_ADMIN: "25000", SUB_ADMIN: "15000"
};

const DEFAULT_TUTORIALS: TutorialLinks = {
  STUDENT: "https://youtube.com/watch?v=eduignite-student",
  TEACHER: "https://youtube.com/watch?v=eduignite-teacher",
  PARENT: "https://youtube.com/watch?v=eduignite-parent",
  SCHOOL_ADMIN: "https://youtube.com/watch?v=eduignite-admin",
  SUB_ADMIN: "https://youtube.com/watch?v=eduignite-subadmin",
  BURSAR: "https://youtube.com/watch?v=eduignite-bursar",
  LIBRARIAN: "https://youtube.com/watch?v=eduignite-librarian",
};

const PLATFORM_DEFAULTS: PlatformSettings = {
  name: "EduIgnite",
  logo: "https://picsum.photos/seed/eduignite-platform/200/200",
  paymentDeadline: "2024-10-31",
  fees: DEFAULT_FEES,
  tutorialLinks: DEFAULT_TUTORIALS,
  honourRollThreshold: 15.0
};

const INITIAL_SCHOOLS: SchoolInfo[] = [{
  id: "GBHS-D", name: "GBHS Deido", shortName: "GBHSD", principal: "Dr. Jean-Pierre Fonka",
  motto: "Discipline - Work - Success", logo: "https://picsum.photos/seed/school-logo-1/200/200",
  banner: "https://picsum.photos/seed/school-banner/1200/400",
  description: "One of the premier government institutions in Douala.",
  location: "Douala, Littoral", region: "Littoral", division: "Wouri",
  subDivision: "Douala 1er", cityVillage: "Douala", address: "Rue de Deido, BP 123",
  phone: "+237 670 00 00 00", email: "contact@gbhsdeido.cm", status: "Active"
}];

const INITIAL_EVENTS: PublicEvent[] = [
  { id: "e1", type: "video", title: "Annual Pedagogical Conference 2024", description: "Witness the digital transformation journey of 120+ schools.", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  { id: "e2", type: "image", title: "New STEM Laboratory Launch", description: "Inaugurating state-of-the-art facilities.", url: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop" }
];

const INITIAL_BLOGS: CommunityBlog[] = [{
  id: "BLOG-CEO-1", title: "Global Node Expansion Milestone",
  senderName: "EduIgnite CEO", senderRole: "CEO",
  senderAvatar: "https://picsum.photos/seed/ceo/150/150",
  image: "https://images.unsplash.com/photo-1523050335392-9bc56751f11b?q=80&w=2070&auto=format&fit=crop",
  paragraphs: ["Today marks a significant milestone.", "Our mission remains clear."],
  createdAt: new Date(Date.now() - 86400000)
}];

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(PLATFORM_DEFAULTS);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  const [testimonials, setTestimonials] = useState<Testimony[]>([]);
  const [communityBlogs, setCommunityBlogs] = useState<CommunityBlog[]>([]);

  useEffect(() => {
    const load = (key: string, defaultValue: any) => {
      const saved = localStorage.getItem(`eduignite_${key}`);
      if (saved) { try { const p = JSON.parse(saved); return Array.isArray(p) ? (p.length > 0 ? p : defaultValue) : { ...defaultValue, ...p }; } catch { /* ignore */ } }
      return defaultValue;
    };
    setPlatformSettings(load("platform", PLATFORM_DEFAULTS));
    setSchools(load("schools", INITIAL_SCHOOLS));
    setPublicEvents(load("events", INITIAL_EVENTS));
    setTestimonials(load("testimonials", []));
    setCommunityBlogs(load("community_blogs", INITIAL_BLOGS));
  }, []);

  useEffect(() => {
    localStorage.setItem("eduignite_platform", JSON.stringify(platformSettings));
    localStorage.setItem("eduignite_schools", JSON.stringify(schools));
    localStorage.setItem("eduignite_events", JSON.stringify(publicEvents));
    localStorage.setItem("eduignite_testimonials", JSON.stringify(testimonials));
    localStorage.setItem("eduignite_community_blogs", JSON.stringify(communityBlogs));
  }, [platformSettings, schools, publicEvents, testimonials, communityBlogs]);

  const updatePlatformSettings = (updates: Partial<PlatformSettings>) => setPlatformSettings(prev => ({ ...prev, ...updates }));

  const addSchool = (s: Omit<SchoolInfo, "status">) => setSchools(prev => [{ ...s, status: "Active" }, ...prev]);
  const toggleSchoolStatus = (id: string) => setSchools(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Suspended' : 'Active' } : s));
  const deleteSchool = (id: string) => setSchools(prev => prev.filter(s => s.id !== id));

  const addPublicEvent = (e: Omit<PublicEvent, "id">) => setPublicEvents(prev => [{ ...e, id: `EVT-${Math.random().toString(36).substr(2, 5).toUpperCase()}` }, ...prev]);
  const deletePublicEvent = (id: string) => setPublicEvents(prev => prev.filter(e => e.id !== id));

  const addTestimony = (t: Omit<Testimony, "id" | "status" | "createdAt">) => setTestimonials(prev => [{ ...t, id: Math.random().toString(36).substr(2, 9), status: "pending", createdAt: new Date() }, ...prev]);
  const approveTestimony = (id: string) => setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status: "approved" } : t));
  const deleteTestimony = (id: string) => setTestimonials(prev => prev.filter(t => t.id !== id));

  const addCommunityBlog = (b: Omit<CommunityBlog, "id" | "createdAt">) => setCommunityBlogs(prev => [{ ...b, id: `BLOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, createdAt: new Date() }, ...prev]);
  const deleteCommunityBlog = (id: string) => setCommunityBlogs(prev => prev.filter(b => b.id !== id));

  return (
    <PlatformContext.Provider value={{
      platformSettings, schools, publicEvents, testimonials, communityBlogs,
      updatePlatformSettings, addSchool, toggleSchoolStatus, deleteSchool,
      addPublicEvent, deletePublicEvent, addTestimony, approveTestimony,
      deleteTestimony, addCommunityBlog, deleteCommunityBlog,
    }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) throw new Error("usePlatform must be used within a PlatformProvider");
  return context;
};
