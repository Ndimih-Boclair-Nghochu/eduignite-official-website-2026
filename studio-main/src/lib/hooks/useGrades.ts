import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { gradesService } from '@/lib/api/services/grades.service';
import type {
  Subject,
  Sequence,
  Grade,
  ReportCard,
  ClassResults,
  TermResults,
  AnnualResults,
  CreateGradeRequest,
  BulkCreateGradesRequest,
  PaginationParams,
} from '@/lib/api/types';

// Query Key Factory
const gradesKeys = {
  all: ['grades'] as const,
  subjects: () => [...gradesKeys.all, 'subjects'] as const,
  subjectsList: (params?: PaginationParams) =>
    [...gradesKeys.subjects(), { ...params }] as const,
  sequences: () => [...gradesKeys.all, 'sequences'] as const,
  sequencesList: (params?: PaginationParams) =>
    [...gradesKeys.sequences(), { ...params }] as const,
  activeSequences: () => [...gradesKeys.all, 'sequences', 'active'] as const,
  lists: () => [...gradesKeys.all, 'list'] as const,
  list: (params?: PaginationParams) =>
    [...gradesKeys.lists(), { ...params }] as const,
  reportCard: (studentId: string, sequenceId: string) =>
    [...gradesKeys.all, 'report-card', studentId, sequenceId] as const,
  classResults: (className: string, sequenceId: string) =>
    [...gradesKeys.all, 'class-results', className, sequenceId] as const,
  termResults: (params?: PaginationParams) =>
    [...gradesKeys.all, 'term-results', { ...params }] as const,
  annualResults: (params?: PaginationParams) =>
    [...gradesKeys.all, 'annual-results', { ...params }] as const,
};

/**
 * Hook for fetching subjects with optional pagination
 */
export function useSubjects(params?: PaginationParams) {
  return useQuery({
    queryKey: gradesKeys.subjectsList(params),
    queryFn: () => gradesService.getSubjects(params),
  });
}

/**
 * Hook for fetching sequences with optional pagination
 */
export function useSequences(params?: PaginationParams) {
  return useQuery({
    queryKey: gradesKeys.sequencesList(params),
    queryFn: () => gradesService.getSequences(params),
  });
}

/**
 * Hook for fetching only active sequences
 */
export function useActiveSequence() {
  return useQuery({
    queryKey: gradesKeys.activeSequences(),
    queryFn: () => gradesService.getActiveSequences(),
  });
}

/**
 * Hook for fetching grades with optional pagination
 */
export function useGrades(params?: PaginationParams) {
  return useQuery({
    queryKey: gradesKeys.list(params),
    queryFn: () => gradesService.getGrades(params),
  });
}

/**
 * Hook for fetching student report card
 * Enabled only when both studentId and sequenceId are provided
 */
export function useReportCard(studentId: string, sequenceId: string) {
  return useQuery({
    queryKey: gradesKeys.reportCard(studentId, sequenceId),
    queryFn: () => gradesService.getReportCard(studentId, sequenceId),
    enabled: !!studentId && !!sequenceId,
  });
}

/**
 * Hook for fetching class results for a specific sequence
 */
export function useClassResults(className: string, sequenceId: string) {
  return useQuery({
    queryKey: gradesKeys.classResults(className, sequenceId),
    queryFn: () => gradesService.getClassResults(className, sequenceId),
    enabled: !!className && !!sequenceId,
  });
}

/**
 * Hook for fetching term results
 */
export function useTermResults(params?: PaginationParams) {
  return useQuery({
    queryKey: gradesKeys.termResults(params),
    queryFn: () => gradesService.getTermResults(params),
  });
}

/**
 * Hook for fetching annual results
 */
export function useAnnualResults(params?: PaginationParams) {
  return useQuery({
    queryKey: gradesKeys.annualResults(params),
    queryFn: () => gradesService.getAnnualResults(params),
  });
}

/**
 * Hook for creating a single grade
 */
export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGradeRequest) =>
      gradesService.createGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradesKeys.lists() });
    },
  });
}

/**
 * Hook for bulk creating grades
 */
export function useBulkCreateGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateGradesRequest) =>
      gradesService.bulkCreateGrades(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gradesKeys.reportCard() });
      queryClient.invalidateQueries({ queryKey: gradesKeys.classResults() });
      queryClient.invalidateQueries({ queryKey: gradesKeys.termResults() });
    },
  });
}
