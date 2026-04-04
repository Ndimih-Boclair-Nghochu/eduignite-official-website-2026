import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  FeeStructure,
  Payment,
  Invoice,
  PaginatedResponse,
  ListParams,
  CreatePaymentRequest,
} from '../types';

export const feesService = {
  async getFeeStructures(params?: ListParams): Promise<PaginatedResponse<FeeStructure>> {
    const { data } = await apiClient.get(API.FEES.STRUCTURES, { params });
    return data;
  },

  async createFeeStructure(feeData: Partial<FeeStructure>): Promise<FeeStructure> {
    const { data } = await apiClient.post(API.FEES.STRUCTURES, feeData);
    return data;
  },

  async updateFeeStructure(id: string, feeData: Partial<FeeStructure>): Promise<FeeStructure> {
    const { data } = await apiClient.patch(API.FEES.STRUCTURE_DETAIL(id), feeData);
    return data;
  },

  async deleteFeeStructure(id: string): Promise<void> {
    await apiClient.delete(API.FEES.STRUCTURE_DETAIL(id));
  },

  async getPayments(params?: ListParams): Promise<PaginatedResponse<Payment>> {
    const { data } = await apiClient.get(API.FEES.PAYMENTS, { params });
    return data;
  },

  async getMyPayments(params?: ListParams): Promise<PaginatedResponse<Payment>> {
    const { data } = await apiClient.get(API.FEES.MY_PAYMENTS, { params });
    return data;
  },

  async createPayment(paymentData: CreatePaymentRequest): Promise<Payment> {
    const { data } = await apiClient.post(API.FEES.PAYMENTS, paymentData);
    return data;
  },

  async confirmPayment(id: string): Promise<Payment> {
    const { data } = await apiClient.post(API.FEES.CONFIRM(id), {});
    return data;
  },

  async rejectPayment(id: string, reason?: string): Promise<Payment> {
    const { data } = await apiClient.post(API.FEES.REJECT(id), { reason });
    return data;
  },

  async getRevenueReport(params?: ListParams): Promise<any> {
    const { data } = await apiClient.get(API.FEES.REVENUE_REPORT, { params });
    return data;
  },

  async getOutstandingFees(params?: ListParams): Promise<PaginatedResponse<any>> {
    const { data } = await apiClient.get(API.FEES.OUTSTANDING, { params });
    return data;
  },

  async getReceipt(id: string): Promise<Blob> {
    const { data } = await apiClient.get(API.FEES.RECEIPT(id), {
      responseType: 'blob',
    });
    return data;
  },

  async getInvoices(params?: ListParams): Promise<PaginatedResponse<Invoice>> {
    const { data } = await apiClient.get(API.FEES.INVOICES, { params });
    return data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const { data } = await apiClient.get(API.FEES.INVOICE_DETAIL(id));
    return data;
  },
};
