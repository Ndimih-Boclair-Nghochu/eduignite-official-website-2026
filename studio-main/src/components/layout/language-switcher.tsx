"use client";

import { useEffect } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: Record<string, unknown>,
          elementId: string
        ) => void;
      };
    };
  }
}

interface LanguageSwitcherProps {
  className?: string;
  tone?: "light" | "dark";
}

export function LanguageSwitcher({ className, tone = "light" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useI18n();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.getElementById("google_translate_element")) {
      const host = document.createElement("div");
      host.id = "google_translate_element";
      host.style.position = "fixed";
      host.style.left = "-9999px";
      host.style.top = "-9999px";
      document.body.appendChild(host);
    }

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,fr",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else {
      window.googleTranslateElementInit?.();
    }
  }, []);

  const applyWholePageTranslation = (lang: "en" | "fr") => {
    if (typeof document === "undefined") return;
    const cookieValue = lang === "en" ? "/en/en" : `/en/${lang}`;
    document.cookie = `googtrans=${cookieValue}; path=/`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;

    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = lang === "en" ? "" : lang;
      combo.dispatchEvent(new Event("change"));
    } else {
      window.setTimeout(() => window.location.reload(), 250);
    }
  };

  const handleLanguageChange = (lang: "en" | "fr") => {
    setLanguage(lang);
    applyWholePageTranslation(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-10 gap-2 rounded-xl px-3 font-black uppercase tracking-widest text-[10px]",
            tone === "dark"
              ? "text-white hover:bg-white/10 hover:text-white"
              : "text-primary hover:bg-primary/5",
            className
          )}
          aria-label="Change language"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{language === "fr" ? "Francais" : "English"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={() => handleLanguageChange("en")} className={language === "en" ? "bg-accent" : ""}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange("fr")} className={language === "fr" ? "bg-accent" : ""}>
          Francais
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
