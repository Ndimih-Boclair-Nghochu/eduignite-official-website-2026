import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  AIRequest,
  AIInsight,
  PaginatedResponse,
  ListParams,
} from '../types';

export const aiService = {
  async getAIRequests(params?: ListParams): Promise<PaginatedResponse<AIRequest>> {
    const { data } = await apiClient.get(API.AI.REQUESTS, { params });
    return data;
  },

  async getAIRequest(id: string): Promise<AIRequest> {
    const { data } = await apiClient.get(API.AI.REQUEST_DETAIL(id));
    return data;
  },

  async generateStudyPlan(
    studentId: string,
    subjects: string[],
    weeks: number
  ): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.STUDY_PLAN, {
      student: studentId,
      subjects,
      weeks,
    });
    return data;
  },

  async analyzeGrades(studentId: string, sequenceId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.ANALYZE_GRADES, {
      student: studentId,
      sequence: sequenceId,
    });
    return data;
  },

  async getAttendanceInsight(studentId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.ATTENDANCE_INSIGHT, {
      student: studentId,
    });
    return data;
  },

  async getExamPrep(studentId: string, subjectId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.EXAM_PREP, {
      student: studentId,
      subject: subjectId,
    });
    return data;
  },

  async getParentReport(studentId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.PARENT_REPORT, {
      student: studentId,
    });
    return data;
  },

  async getPlatformInsights(): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.PLATFORM_INSIGHTS, {});
    return data;
  },

  async getInsights(params?: ListParams): Promise<PaginatedResponse<AIInsight>> {
    const { data } = await apiClient.get(API.AI.INSIGHTS, { params });
    return data;
  },

  async getInsight(id: string): Promise<AIInsight> {
    const { data } = await apiClient.get(API.AI.INSIGHT_DETAIL(id));
    return data;
  },

  async generateInsights(): Promise<AIInsight> {
    const { data } = await apiClient.post(API.AI.GENERATE_INSIGHTS, {});
    return data;
  },
};
