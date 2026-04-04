import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  User,
  PaginatedResponse,
  ListParams,
  CreateUserRequest,
  UpdateUserRequest,
  PlatformStats,
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

  async updateProfile(data: UpdateUserRequest): Promise<User> {
    const { data: response } = await apiClient.patch(API.USERS.ME, data);
    return response;
  },

  async updateRole(id: string, role: string): Promise<User> {
    const { data } = await apiClient.patch(API.USERS.UPDATE_ROLE(id), { role });
    return data;
  },

  async toggleLicense(id: string): Promise<User> {
    const { data } = await apiClient.post(API.USERS.TOGGLE_LICENSE(id), {});
    return data;
  },

  async getStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.USERS.STATS);
    return data;
  },

  async getExecutives(params?: ListParams): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get(API.USERS.EXECUTIVES, { params });
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

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(API.USERS.DETAIL(id));
  },
};
