"use client";

import { useEffect, useState } from "react";
import { Building2, Layers3, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { schoolsService } from "@/lib/api/services/schools.service";
import { getApiErrorMessage } from "@/lib/api/errors";

type HierarchyKey = "sections" | "class_levels" | "departments" | "streams";

const SUGGESTED_HIERARCHY: Record<HierarchyKey, string[]> = {
  sections: ["English Section", "French Section", "Bilingual Section", "Technical Section"],
  class_levels: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Lower Sixth", "Upper Sixth"],
  departments: ["Science", "Arts", "Commercial", "Industrial", "Languages", "Administration"],
  streams: ["General Education", "Technical Education", "Commercial", "Industrial", "Bilingual"],
};

const EMPTY_HIERARCHY: Record<HierarchyKey, string[]> = {
  sections: [],
  class_levels: [],
  departments: [],
  streams: [],
};

const CONFIG: Array<{
  key: HierarchyKey;
  title: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "sections",
    title: "School Sections",
    description: "Register the active school systems such as English, French, Bilingual and Technical.",
    placeholder: "e.g. Bilingual Section",
  },
  {
    key: "class_levels",
    title: "Class Levels",
    description: "Define every class level used when registering students, teachers, report cards and attendance.",
    placeholder: "e.g. Form 1",
  },
  {
    key: "departments",
    title: "Departments",
    description: "Create academic and administrative departments for staff assignment and subject control.",
    placeholder: "e.g. Science Department",
  },
  {
    key: "streams",
    title: "Streams & Specialisations",
    description: "Add optional pathways such as General, Commercial, Industrial or other school-specific tracks.",
    placeholder: "e.g. Industrial Stream",
  },
];

interface SchoolHierarchyManagerProps {
  schoolId: string;
  schoolName?: string;
}

export function SchoolHierarchyManager({ schoolId, schoolName }: SchoolHierarchyManagerProps) {
  const { toast } = useToast();
  const [hierarchy, setHierarchy] = useState<Record<HierarchyKey, string[]>>(EMPTY_HIERARCHY);
  const [drafts, setDrafts] = useState<Record<HierarchyKey, string>>({
    sections: "",
    class_levels: "",
    departments: "",
    streams: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await schoolsService.getSchoolSettings(schoolId);
        if (!active) return;
        setHierarchy({
          sections: settings.sections ?? [],
          class_levels: settings.class_levels ?? [],
          departments: settings.departments ?? [],
          streams: settings.streams ?? [],
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Hierarchy load failed",
          description: getApiErrorMessage(error, "Could not load school hierarchy settings."),
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadSettings();
    return () => {
      active = false;
    };
  }, [schoolId, toast]);

  const addItem = (key: HierarchyKey) => {
    const value = drafts[key].trim();
    if (!value) return;
    setHierarchy((prev) => ({
      ...prev,
      [key]: prev[key].some((item) => item.toLowerCase() === value.toLowerCase())
        ? prev[key]
        : [...prev[key], value],
    }));
    setDrafts((prev) => ({ ...prev, [key]: "" }));
  };

  const removeItem = (key: HierarchyKey, value: string) => {
    setHierarchy((prev) => ({ ...prev, [key]: prev[key].filter((item) => item !== value) }));
  };

  const saveHierarchy = async () => {
    setIsSaving(true);
    try {
      await schoolsService.updateSchoolSettings(schoolId, hierarchy);
      toast({
        title: "Hierarchy saved",
        description: "Sections, classes, departments and streams are now available for school operations.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: getApiErrorMessage(error, "Could not save the school hierarchy."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-primary font-headline">
            <div className="rounded-xl bg-primary p-2 text-secondary shadow-lg">
              <Layers3 className="h-6 w-6" />
            </div>
            Hierarchy & Sections
          </h1>
          <p className="mt-1 text-muted-foreground">
            Structure {schoolName || "your school"} for admissions, classes, departments, attendance and report cards.
          </p>
        </div>
        <Button onClick={saveHierarchy} disabled={isSaving} className="h-12 gap-2 rounded-2xl px-8 font-black uppercase tracking-widest text-xs shadow-xl">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Structure
        </Button>
      </div>

      <Card className="overflow-hidden rounded-3xl border-none bg-primary text-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <Building2 className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Operational Registry</p>
              <h2 className="text-xl font-black">{schoolName || "Institution"}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
            {CONFIG.map((section) => (
              <div key={section.key} className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-2xl font-black text-secondary">{hierarchy[section.key].length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{section.title}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CONFIG.map((section) => (
          <Card key={section.key} className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add Item</Label>
                  <Input
                    value={drafts[section.key]}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [section.key]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addItem(section.key);
                      }
                    }}
                    placeholder={section.placeholder}
                    className="h-11 rounded-xl border-none bg-accent/30"
                  />
                </div>
                <Button type="button" onClick={() => addItem(section.key)} className="mt-7 h-11 rounded-xl px-4">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {hierarchy[section.key].map((item) => (
                  <Badge key={item} variant="secondary" className="gap-2 rounded-xl bg-primary/5 px-3 py-2 text-primary">
                    {item}
                    <button type="button" onClick={() => removeItem(section.key, item)} aria-label={`Remove ${item}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </Badge>
                ))}
                {hierarchy[section.key].length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No {section.title.toLowerCase()} saved yet. Add the exact names your school wants to use.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Optional Suggestions
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_HIERARCHY[section.key]
                    .filter((item) => !hierarchy[section.key].some((existing) => existing.toLowerCase() === item.toLowerCase()))
                    .map((item) => (
                      <Button
                        key={item}
                        type="button"
                        variant="outline"
                        className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        onClick={() =>
                          setHierarchy((prev) => ({
                            ...prev,
                            [section.key]: [...prev[section.key], item],
                          }))
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {item}
                      </Button>
                    ))}
                  {SUGGESTED_HIERARCHY[section.key].every((item) =>
                    hierarchy[section.key].some((existing) => existing.toLowerCase() === item.toLowerCase())
                  ) && <p className="text-xs text-muted-foreground">All suggestions already added.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
