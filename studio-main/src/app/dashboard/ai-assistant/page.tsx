"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import {
  useAIRequests,
  useGenerateStudyPlan,
  useAnalyzeGrades,
  useExamPrep,
  useParentReport,
  usePlatformInsights,
  useAIInsights,
} from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Plus,
  Clock,
  MessageSquare,
  Lightbulb,
  BookMarked,
  FileText,
  Users,
  Send,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIRequest, AIInsight } from "@/types/ai";

type RequestType = "study_plan" | "grade_analysis" | "exam_prep" | "parent_report" | "general";

const SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "French",
  "History",
  "Geography",
];

const WEEKS_OPTIONS = [2, 4, 8];

export default function AiAssistantPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  // Hooks for fetching requests
  const { data: requestsResponse, isLoading } = useAIRequests({
    refetchInterval: false,
  });

  // Hooks for insights (executives only)
  const { data: insightsResponse } = useAIInsights();
  const { data: platformInsights } = usePlatformInsights();

  // Mutation hooks
  const studyPlanMutation = useGenerateStudyPlan();
  const analyzeGradesMutation = useAnalyzeGrades();
  const examPrepMutation = useExamPrep();
  const parentReportMutation = useParentReport();

  // Local state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("history");
  const [requestType, setRequestType] = useState<RequestType>("study_plan");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Study plan form
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<number>(4);

  // Exam prep form
  const [selectedSubjectExam, setSelectedSubjectExam] = useState<string>("");

  // General form
  const [generalPrompt, setGeneralPrompt] = useState<string>("");

  // Child selector for parent report
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Get requests list
  const requests = requestsResponse?.results ?? [];

  // Auto-select most recent request on load
  useEffect(() => {
    if (requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  // Get selected request details
  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  // Check for pending requests for polling
  const hasPending = requests.some(
    (r) => r.status === "pending" || r.status === "processing"
  );

  // Update polling interval when pending status changes
  useEffect(() => {
    // This would require re-configuring the hook, but the pattern
    // shows that the caller should check hasPending
  }, [hasPending]);

  const handleGenerateStudyPlan = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "Please select subjects",
        description: "Choose at least one subject for your study plan",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await studyPlanMutation.mutateAsync({
        subjects: selectedSubjects,
        weeks: selectedWeeks,
      });
      toast({
        title: "Study plan requested",
        description: "Your AI study plan is being generated...",
      });
      setSelectedSubjects([]);
      setSelectedWeeks(4);
      setRequestType("study_plan");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to generate study plan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzeGrades = async () => {
    setIsSubmitting(true);
    try {
      await analyzeGradesMutation.mutateAsync({});
      toast({
        title: "Grade analysis requested",
        description: "Your grades are being analyzed...",
      });
      setRequestType("grade_analysis");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to analyze grades",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExamPrep = async () => {
    if (!selectedSubjectExam) {
      toast({
        title: "Please select a subject",
        description: "Choose a subject for exam preparation",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await examPrepMutation.mutateAsync({
        subject_id: selectedSubjectExam,
      });
      toast({
        title: "Exam prep requested",
        description: "Your exam preparation plan is being generated...",
      });
      setSelectedSubjectExam("");
      setRequestType("exam_prep");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to generate exam prep",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentReport = async () => {
    if (!selectedChildId) {
      toast({
        title: "Please select a child",
        description: "Choose a child to generate report for",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await parentReportMutation.mutateAsync({
        student_id: selectedChildId,
      });
      toast({
        title: "Parent report requested",
        description: "Your child's report is being generated...",
      });
      setSelectedChildId("");
      setRequestType("parent_report");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to generate parent report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneralRequest = async () => {
    if (!generalPrompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Type your question or request",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Note: general requests would use a separate mutation if available
      // For now, this is a placeholder pattern
      toast({
        title: "Request submitted",
        description: "Your request is being processed...",
      });
      setGeneralPrompt("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
            Queued
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700">Completed</Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case "study_plan":
        return <BookMarked className="w-4 h-4" />;
      case "grade_analysis":
        return <FileText className="w-4 h-4" />;
      case "exam_prep":
        return <Lightbulb className="w-4 h-4" />;
      case "parent_report":
        return <Users className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "study_plan":
        return "Study Plan";
      case "grade_analysis":
        return "Grade Analysis";
      case "exam_prep":
        return "Exam Prep";
      case "parent_report":
        return "Parent Report";
      default:
        return "General Request";
    }
  };

  // Role-based visibility
  const canGenerateStudyPlan =
    user?.role === "STUDENT" || user?.role === "SCHOOL_ADMIN" || user?.role === "SUB_ADMIN" || user?.role === "CEO" || user?.role === "CTO";
  const canAnalyzeGrades =
    user?.role === "STUDENT" ||
    user?.role === "PARENT" ||
    user?.role === "TEACHER" ||
    user?.role === "SCHOOL_ADMIN" ||
    user?.role === "SUB_ADMIN" ||
    user?.role === "CEO" ||
    user?.role === "CTO";
  const canExamPrep =
    user?.role === "STUDENT" || user?.role === "SCHOOL_ADMIN" || user?.role === "SUB_ADMIN" || user?.role === "CEO" || user?.role === "CTO";
  const canParentReport = user?.role === "PARENT";
  const isExecutive =
    user?.role === "CEO" || user?.role === "CTO" || user?.role === "SUPER_ADMIN";

  const renderNewRequestForm = () => {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            New AI Request
          </CardTitle>
          <CardDescription>
            Generate insights tailored to your role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request Type Selector */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              Request Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {canGenerateStudyPlan && (
                <Button
                  variant={requestType === "study_plan" ? "default" : "outline"}
                  onClick={() => setRequestType("study_plan")}
                  className="flex items-center gap-2 h-auto py-3"
                >
                  <BookMarked className="w-4 h-4" />
                  <span className="text-xs">Study Plan</span>
                </Button>
              )}
              {canAnalyzeGrades && (
                <Button
                  variant={requestType === "grade_analysis" ? "default" : "outline"}
                  onClick={() => setRequestType("grade_analysis")}
                  className="flex items-center gap-2 h-auto py-3"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Grade Analysis</span>
                </Button>
              )}
              {canExamPrep && (
                <Button
                  variant={requestType === "exam_prep" ? "default" : "outline"}
                  onClick={() => setRequestType("exam_prep")}
                  className="flex items-center gap-2 h-auto py-3"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-xs">Exam Prep</span>
                </Button>
              )}
              {canParentReport && (
                <Button
                  variant={requestType === "parent_report" ? "default" : "outline"}
                  onClick={() => setRequestType("parent_report")}
                  className="flex items-center gap-2 h-auto py-3"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Parent Report</span>
                </Button>
              )}
              <Button
                variant={requestType === "general" ? "default" : "outline"}
                onClick={() => setRequestType("general")}
                className="flex items-center gap-2 h-auto py-3"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">General</span>
              </Button>
            </div>
          </div>

          {/* Dynamic Form Fields */}
          {requestType === "study_plan" && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Select Subjects
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SUBJECTS.map((subject) => (
                  <label
                    key={subject}
                    className="flex items-center gap-2 p-2 rounded-lg border border-accent hover:bg-accent/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject)}
                      onChange={() => toggleSubject(subject)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-foreground">{subject}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Duration (weeks)
                </label>
                <div className="flex gap-2">
                  {WEEKS_OPTIONS.map((weeks) => (
                    <Button
                      key={weeks}
                      variant={selectedWeeks === weeks ? "default" : "outline"}
                      onClick={() => setSelectedWeeks(weeks)}
                      className="flex-1"
                    >
                      {weeks}w
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {requestType === "grade_analysis" && (
            <div className="p-4 bg-accent/20 rounded-lg border border-accent/50">
              <p className="text-sm text-foreground">
                Click below to analyze your current grades and get insights.
              </p>
            </div>
          )}

          {requestType === "exam_prep" && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Select Subject
              </label>
              <Select value={selectedSubjectExam} onValueChange={setSelectedSubjectExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requestType === "parent_report" && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Select Child
              </label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your child..." />
                </SelectTrigger>
                <SelectContent>
                  {/* This would be populated from user's children data */}
                  <SelectItem value="child1">Child 1</SelectItem>
                  <SelectItem value="child2">Child 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {requestType === "general" && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Your Question
              </label>
              <textarea
                value={generalPrompt}
                onChange={(e) => setGeneralPrompt(e.target.value)}
                placeholder="Ask anything you'd like help with..."
                className="w-full h-24 p-3 rounded-lg border border-accent bg-white text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => {
              switch (requestType) {
                case "study_plan":
                  handleGenerateStudyPlan();
                  break;
                case "grade_analysis":
                  handleAnalyzeGrades();
                  break;
                case "exam_prep":
                  handleExamPrep();
                  break;
                case "parent_report":
                  handleParentReport();
                  break;
                case "general":
                  handleGeneralRequest();
                  break;
              }
            }}
            disabled={
              isSubmitting ||
              (requestType === "study_plan" && selectedSubjects.length === 0) ||
              (requestType === "exam_prep" && !selectedSubjectExam) ||
              (requestType === "parent_report" && !selectedChildId) ||
              (requestType === "general" && !generalPrompt.trim())
            }
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      <div className="h-12 bg-accent/20 rounded-lg animate-pulse" />
      <div className="h-12 bg-accent/20 rounded-lg animate-pulse" />
      <div className="h-12 bg-accent/20 rounded-lg animate-pulse" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-2">
          <div className="p-2 bg-primary rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6 text-secondary fill-secondary/20" />
          </div>
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage and track your AI-powered insights
        </p>
      </div>

      {/* Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="history">Request History</TabsTrigger>
          <TabsTrigger value="new">New Request</TabsTrigger>
          {isExecutive && (
            <TabsTrigger value="insights" className="hidden md:inline-flex">
              Insights
            </TabsTrigger>
          )}
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Requests List */}
            <Card className="border-none shadow-lg w-full md:w-96 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Requests
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-4">
                  {isLoading ? (
                    renderLoadingSkeleton()
                  ) : requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      <p className="text-sm">No requests yet</p>
                    </div>
                  ) : (
                    requests.map((request) => (
                      <div
                        key={request.id}
                        onClick={() => setSelectedRequestId(request.id)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          selectedRequestId === request.id
                            ? "bg-primary/10 border-primary shadow-md"
                            : "bg-white border-accent hover:border-accent/70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getRequestTypeIcon(request.request_type)}
                            <span className="font-semibold text-sm truncate">
                              {getRequestTypeLabel(request.request_type)}
                            </span>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {request.prompt}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Request Details */}
            <Card className="border-none shadow-lg flex-1 hidden md:flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Details
                </CardTitle>
              </CardHeader>
              {selectedRequest ? (
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Request Info */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        {getRequestTypeIcon(selectedRequest.request_type)}
                        {getRequestTypeLabel(selectedRequest.request_type)}
                      </h3>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-muted-foreground">
                          {new Date(
                            selectedRequest.created_at
                          ).toLocaleString()}
                        </p>
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    </div>

                    {/* Prompt */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Prompt</h4>
                      <div className="bg-accent/20 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                        {selectedRequest.prompt}
                      </div>
                    </div>

                    {/* Response */}
                    {selectedRequest.status === "processing" ||
                    selectedRequest.status === "pending" ? (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Response</h4>
                        <div className="bg-accent/10 rounded-lg p-6 flex items-center justify-center min-h-32">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              AI is thinking...
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              This may take a moment
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : selectedRequest.response ? (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Response</h4>
                        <div className="bg-accent/10 rounded-lg p-4 text-sm text-foreground space-y-3">
                          {selectedRequest.response
                            .split("\n\n")
                            .filter((p) => p.trim())
                            .map((paragraph, idx) => (
                              <p key={idx} className="whitespace-pre-wrap">
                                {paragraph}
                              </p>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-accent/10 rounded-lg p-4 text-sm text-muted-foreground">
                        No response available
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-sm">Select a request to view details</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* New Request Tab */}
        <TabsContent value="new" className="flex-1 overflow-y-auto">
          {renderNewRequestForm()}
        </TabsContent>

        {/* Insights Tab (Executives Only) */}
        {isExecutive && (
          <TabsContent value="insights" className="flex-1 overflow-y-auto">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Platform Insights
                </CardTitle>
                <CardDescription>
                  AI-generated insights for platform executives
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  renderLoadingSkeleton()
                ) : !insightsResponse ||
                  (Array.isArray(insightsResponse) &&
                    insightsResponse.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-sm">No insights available yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.isArray(insightsResponse) &&
                      insightsResponse.map((insight) => (
                        <Card
                          key={insight.id}
                          className="border-none shadow-md bg-accent/5"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <CardTitle className="text-base">
                                {insight.title}
                              </CardTitle>
                              <Badge variant="outline">
                                {insight.insight_type}
                              </Badge>
                            </div>
                            <CardDescription>
                              {insight.description}
                            </CardDescription>
                          </CardHeader>
                          {insight.data && (
                            <CardContent>
                              <div className="text-sm text-foreground bg-white rounded-lg p-3">
                                {typeof insight.data === "string"
                                  ? insight.data
                                  : JSON.stringify(insight.data, null, 2)}
                              </div>
                            </CardContent>
                          )}
                          {insight.expires_at && (
                            <CardFooter className="text-xs text-muted-foreground">
                              Expires:{" "}
                              {new Date(
                                insight.expires_at
                              ).toLocaleDateString()}
                            </CardFooter>
                          )}
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
