import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { feesService } from '@/lib/api/services/fees.service';
import type {
  FeeStructure,
  Payment,
  RevenueReport,
  Receipt,
  CreateFeeStructureRequest,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  RejectPaymentRequest,
  PaginationParams,
} from '@/lib/api/types';

// Query Key Factory
const feesKeys = {
  all: ['fees'] as const,
  structures: () => [...feesKeys.all, 'structures'] as const,
  structuresList: (params?: PaginationParams) =>
    [...feesKeys.structures(), { ...params }] as const,
  payments: () => [...feesKeys.all, 'payments'] as const,
  paymentsList: (params?: PaginationParams) =>
    [...feesKeys.payments(), { ...params }] as const,
  my: () => [...feesKeys.all, 'my'] as const,
  revenue: (params?: PaginationParams) =>
    [...feesKeys.all, 'revenue', { ...params }] as const,
  outstanding: () => [...feesKeys.all, 'outstanding'] as const,
  receipt: (id: string) => [...feesKeys.all, 'receipt', id] as const,
};

/**
 * Hook for fetching fee structures
 */
export function useFeeStructures(params?: PaginationParams) {
  return useQuery({
    queryKey: feesKeys.structuresList(params),
    queryFn: () => feesService.getFeeStructures(params),
  });
}

/**
 * Hook for fetching paginated payments
 */
export function usePayments(params?: PaginationParams) {
  return useQuery({
    queryKey: feesKeys.paymentsList(params),
    queryFn: () => feesService.getPayments(params),
  });
}

/**
 * Hook for fetching current user's payments
 */
export function useMyPayments() {
  return useQuery({
    queryKey: feesKeys.my(),
    queryFn: () => feesService.getMyPayments(),
  });
}

/**
 * Hook for fetching revenue report
 */
export function useRevenueReport(params?: PaginationParams) {
  return useQuery({
    queryKey: feesKeys.revenue(params),
    queryFn: () => feesService.getRevenueReport(params),
  });
}

/**
 * Hook for fetching outstanding fees
 */
export function useOutstandingFees() {
  return useQuery({
    queryKey: feesKeys.outstanding(),
    queryFn: () => feesService.getOutstandingFees(),
  });
}

/**
 * Hook for fetching a receipt
 * Enabled only when id is provided
 */
export function useReceipt(id: string) {
  return useQuery({
    queryKey: feesKeys.receipt(id),
    queryFn: () => feesService.getReceipt(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a fee structure
 */
export function useCreateFeeStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeeStructureRequest) =>
      feesService.createFeeStructure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feesKeys.structures() });
    },
  });
}

/**
 * Hook for creating a payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) =>
      feesService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feesKeys.paymentsList() });
      queryClient.invalidateQueries({ queryKey: feesKeys.my() });
      queryClient.invalidateQueries({ queryKey: feesKeys.revenue() });
      queryClient.invalidateQueries({ queryKey: feesKeys.outstanding() });
    },
  });
}

/**
 * Hook for confirming a payment
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfirmPaymentRequest) =>
      feesService.confirmPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feesKeys.paymentsList() });
      queryClient.invalidateQueries({ queryKey: feesKeys.revenue() });
    },
  });
}

/**
 * Hook for rejecting a payment
 */
export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectPaymentRequest) =>
      feesService.rejectPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feesKeys.paymentsList() });
    },
  });
}
