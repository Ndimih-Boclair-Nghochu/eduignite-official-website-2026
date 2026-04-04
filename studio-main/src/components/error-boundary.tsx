"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-none shadow-sm bg-red-50/50 m-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-red-800">
                {this.props.fallbackTitle || "Something went wrong"}
              </h3>
              <p className="text-sm text-red-600 max-w-md">
                This section encountered an unexpected error. The rest of the application is unaffected.
              </p>
              {this.state.error && process.env.NODE_ENV === "development" && (
                <p className="text-xs text-red-500 font-mono bg-red-100 p-2 rounded mt-2 max-w-lg break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={this.handleRetry}
              className="gap-2 border-red-200 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for use in Next.js App Router.
 * Wraps a dashboard module page in an error boundary.
 */
export function DashboardErrorBoundary({
  children,
  moduleName,
}: {
  children: React.ReactNode;
  moduleName: string;
}) {
  return (
    <ErrorBoundary fallbackTitle={`Error loading ${moduleName}`}>
      {children}
    </ErrorBoundary>
  );
}
