import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  PlatformSettings,
  PublicEvent,
  PlatformStats,
  ListParams,
  PaginatedResponse,
} from '../types';

export const platformService = {
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data } = await apiClient.get(API.PLATFORM.SETTINGS);
    return data;
  },

  async updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const { data } = await apiClient.patch(API.PLATFORM.SETTINGS, settings);
    return data;
  },

  async getPlatformFees(params?: ListParams): Promise<PaginatedResponse<any>> {
    const { data } = await apiClient.get(API.PLATFORM.FEES, { params });
    return data;
  },

  async updateFee(id: string, feeData: any): Promise<any> {
    const { data } = await apiClient.patch(`${API.PLATFORM.FEES}${id}/`, feeData);
    return data;
  },

  async createFee(feeData: { role: string; amount: number; currency?: string }): Promise<any> {
    const { data } = await apiClient.post(API.PLATFORM.FEES, feeData);
    return data;
  },

  async getPublicEvents(params?: ListParams): Promise<PaginatedResponse<PublicEvent>> {
    const { data } = await apiClient.get(API.PLATFORM.EVENTS, { params });
    return data;
  },

  async createEvent(eventData: Partial<PublicEvent>): Promise<PublicEvent> {
    const { data } = await apiClient.post(API.PLATFORM.EVENTS, eventData);
    return data;
  },

  async createPublicEvent(eventData: Partial<PublicEvent>): Promise<PublicEvent> {
    return this.createEvent(eventData);
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(API.PLATFORM.EVENT_DETAIL(id));
  },

  async deletePublicEvent(id: string): Promise<void> {
    return this.deleteEvent(id);
  },

  async getPlatformStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.PLATFORM.STATS);
    return data;
  },

  async getTutorials(): Promise<Record<string, string>> {
    const { data } = await apiClient.get(API.PLATFORM.TUTORIALS);
    return data;
  },
};
