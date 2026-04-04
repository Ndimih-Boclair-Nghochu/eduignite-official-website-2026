import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { PlatformProvider } from "@/lib/platform-context";
import { DataProvider } from "@/lib/data-context";
import { I18nProvider } from "@/lib/i18n-context";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { TopProgressBar } from "@/components/layout/progress-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/query-client";
import { Suspense } from "react";

const isDev = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: "EduIgnite | School Management System",
  description: "The future of institutional management — powered by EduIgnite",
  keywords: ["school management", "education", "EduIgnite", "SaaS", "Cameroon"],
  authors: [{ name: "EduIgnite", url: "mailto:eduignitecmr@gmail.com" }],
  creator: "EduIgnite",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "EduIgnite | School Management System",
    description: "The future of institutional management",
    siteName: "EduIgnite",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased selection:bg-secondary selection:text-secondary-foreground">
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <FirebaseClientProvider>
              <AuthProvider>
                <PlatformProvider>
                  <DataProvider>
                    <Suspense fallback={null}>
                      <TopProgressBar />
                    </Suspense>
                    {children}
                    <Toaster />
                  </DataProvider>
                </PlatformProvider>
              </AuthProvider>
            </FirebaseClientProvider>
          </I18nProvider>
          {isDev && (
            <Suspense fallback={null}>
              {(() => {
                const ReactQueryDevtools = require("@tanstack/react-query-devtools").ReactQueryDevtools;
                return <ReactQueryDevtools initialIsOpen={false} />;
              })()}
            </Suspense>
          )}
        </QueryClientProvider>
      </body>
    </html>
  );
}
