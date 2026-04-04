import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Subject,
  Sequence,
  Grade,
  ReportCard,
  PaginatedResponse,
  ListParams,
  CreateGradeRequest,
  BulkCreateGradesRequest,
} from '../types';

export const gradesService = {
  async getSubjects(params?: ListParams): Promise<PaginatedResponse<Subject>> {
    const { data } = await apiClient.get(API.GRADES.SUBJECTS, { params });
    return data;
  },

  async createSubject(subjectData: Partial<Subject>): Promise<Subject> {
    const { data } = await apiClient.post(API.GRADES.SUBJECTS, subjectData);
    return data;
  },

  async updateSubject(id: string, subjectData: Partial<Subject>): Promise<Subject> {
    const { data } = await apiClient.patch(API.GRADES.SUBJECT_DETAIL(id), subjectData);
    return data;
  },

  async deleteSubject(id: string): Promise<void> {
    await apiClient.delete(API.GRADES.SUBJECT_DETAIL(id));
  },

  async getSequences(params?: ListParams): Promise<PaginatedResponse<Sequence>> {
    const { data } = await apiClient.get(API.GRADES.SEQUENCES, { params });
    return data;
  },

  async createSequence(sequenceData: Partial<Sequence>): Promise<Sequence> {
    const { data } = await apiClient.post(API.GRADES.SEQUENCES, sequenceData);
    return data;
  },

  async updateSequence(id: string, sequenceData: Partial<Sequence>): Promise<Sequence> {
    const { data } = await apiClient.patch(API.GRADES.SEQUENCE_DETAIL(id), sequenceData);
    return data;
  },

  async getGrades(params?: ListParams): Promise<PaginatedResponse<Grade>> {
    const { data } = await apiClient.get(API.GRADES.GRADES, { params });
    return data;
  },

  async createGrade(gradeData: CreateGradeRequest): Promise<Grade> {
    const { data } = await apiClient.post(API.GRADES.GRADES, gradeData);
    return data;
  },

  async updateGrade(id: string, gradeData: Partial<CreateGradeRequest>): Promise<Grade> {
    const { data } = await apiClient.patch(API.GRADES.GRADE_DETAIL(id), gradeData);
    return data;
  },

  async bulkCreateGrades(bulkData: BulkCreateGradesRequest): Promise<Grade[]> {
    const { data } = await apiClient.post(API.GRADES.BULK_CREATE, bulkData);
    return data;
  },

  async getReportCard(studentId: string, sequenceId: string): Promise<ReportCard> {
    const { data } = await apiClient.get(API.GRADES.REPORT_CARD(studentId, sequenceId));
    return data;
  },

  async getClassResults(className: string, sequenceId: string): Promise<any> {
    const { data } = await apiClient.get(API.GRADES.CLASS_RESULTS(className, sequenceId));
    return data;
  },

  async getTermResults(params?: ListParams): Promise<any> {
    const { data } = await apiClient.get(API.GRADES.TERM_RESULTS, { params });
    return data;
  },

  async getAnnualResults(params?: ListParams): Promise<any> {
    const { data } = await apiClient.get(API.GRADES.ANNUAL_RESULTS, { params });
    return data;
  },
};
