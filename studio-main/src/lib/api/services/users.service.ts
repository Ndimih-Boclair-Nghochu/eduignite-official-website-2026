import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  User,
  FounderProfile,
  PaginatedResponse,
  ListParams,
  CreateUserRequest,
  UpdateUserRequest,
  PlatformStats,
  CreateFounderRequest,
  UpdateFounderRequest,
  AddFounderSharesRequest,
} from '../types';

export const usersService = {
  async getUsers(params?: ListParams): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get(API.USERS.BASE, { params });
    return data;
  },

  async getUser(id: string): Promise<User> {
    const { data } = await apiClient.get(API.USERS.DETAIL(id));
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get(API.USERS.ME);
    return data;
  },

  async updateProfile(idOrData: string | UpdateUserRequest, data?: UpdateUserRequest): Promise<User> {
    const payload = typeof idOrData === 'string' ? data ?? {} : idOrData;
    const { data: response } = await apiClient.patch(API.USERS.ME, payload);
    return response;
  },

  async updateRole(id: string, roleOrPayload: string | { role: string }): Promise<User> {
    const role = typeof roleOrPayload === 'string' ? roleOrPayload : roleOrPayload.role;
    const { data } = await apiClient.post(API.USERS.UPDATE_ROLE(id), { role });
    return data;
  },

  async toggleLicense(id: string, payload?: { is_license_paid?: boolean; isLicensePaid?: boolean }): Promise<User> {
    const { data } = await apiClient.post(API.USERS.TOGGLE_LICENSE(id), {
      is_license_paid: payload?.is_license_paid ?? payload?.isLicensePaid ?? true,
    });
    return data;
  },

  async getStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.USERS.STATS);
    return data;
  },

  async getUserStats(): Promise<PlatformStats> {
    return this.getStats();
  },

  async getExecutives(params?: ListParams): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get(API.USERS.EXECUTIVES, { params });
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      };
    }
    return data;
  },

  async getUsersBySchool(schoolId: string, params?: ListParams): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get(API.USERS.BY_SCHOOL(schoolId), { params });
    return data;
  },

  async createUser(userData: CreateUserRequest): Promise<User> {
    const { data } = await apiClient.post(API.USERS.BASE, userData);
    return data;
  },

  async getFounders(): Promise<FounderProfile[]> {
    const { data } = await apiClient.get(API.USERS.FOUNDERS);
    return data;
  },

  async createFounder(payload: CreateFounderRequest): Promise<FounderProfile> {
    const { data } = await apiClient.post(API.USERS.FOUNDERS, payload);
    return data;
  },

  async updateFounder(id: string, payload: UpdateFounderRequest): Promise<FounderProfile> {
    const { data } = await apiClient.patch(API.USERS.FOUNDER_DETAIL(id), payload);
    return data;
  },

  async addFounderShares(id: string, payload: AddFounderSharesRequest): Promise<FounderProfile> {
    const { data } = await apiClient.post(API.USERS.ADD_FOUNDER_SHARES(id), payload);
    return data;
  },

  async renewFounderShares(id: string): Promise<FounderProfile> {
    const { data } = await apiClient.post(API.USERS.RENEW_FOUNDER_SHARES(id));
    return data;
  },

  async removeShareAdjustment(founderId: string, adjustmentId: string): Promise<FounderProfile> {
    const { data } = await apiClient.delete(
      API.USERS.REMOVE_SHARE_ADJUSTMENT(founderId, adjustmentId)
    );
    return data;
  },

  async deleteFounder(id: string): Promise<void> {
    await apiClient.delete(API.USERS.FOUNDER_DETAIL(id));
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(API.USERS.DETAIL(id));
  },
};
