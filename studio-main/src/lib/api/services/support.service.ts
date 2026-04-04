import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  SupportContribution,
  PaginatedResponse,
  ListParams,
  PlatformStats,
} from '../types';

export const supportService = {
  async getSupportContributions(
    params?: ListParams
  ): Promise<PaginatedResponse<SupportContribution>> {
    const { data } = await apiClient.get(API.SUPPORT.BASE, { params });
    return data;
  },

  async getSupportContribution(id: string): Promise<SupportContribution> {
    const { data } = await apiClient.get(API.SUPPORT.DETAIL(id));
    return data;
  },

  async createSupport(supportData: Partial<SupportContribution>): Promise<SupportContribution> {
    const { data } = await apiClient.post(API.SUPPORT.BASE, supportData);
    return data;
  },

  async verifySupport(id: string): Promise<SupportContribution> {
    const { data } = await apiClient.post(API.SUPPORT.VERIFY(id), {});
    return data;
  },

  async rejectSupport(id: string, reason?: string): Promise<SupportContribution> {
    const { data } = await apiClient.post(API.SUPPORT.REJECT(id), { reason });
    return data;
  },

  async getSupportStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.SUPPORT.STATS);
    return data;
  },
};
