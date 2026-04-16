import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  School,
  SchoolSettings,
  PaginatedResponse,
  ListParams,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  PlatformStats,
} from '../types';

export const schoolsService = {
  async getSchools(params?: ListParams): Promise<PaginatedResponse<School>> {
    const { data } = await apiClient.get(API.SCHOOLS.BASE, { params });
    return data;
  },

  async getSchool(id: string): Promise<School> {
    const { data } = await apiClient.get(API.SCHOOLS.DETAIL(id));
    return data;
  },

  async getMySchool(): Promise<School> {
    const { data } = await apiClient.get(API.SCHOOLS.MY_SCHOOL);
    return data;
  },

  async createSchool(schoolData: CreateSchoolRequest): Promise<School> {
    const { data } = await apiClient.post(API.SCHOOLS.BASE, schoolData);
    return data;
  },

  async updateSchool(id: string, schoolData: UpdateSchoolRequest): Promise<School> {
    const { data } = await apiClient.patch(API.SCHOOLS.DETAIL(id), schoolData);
    return data;
  },

  async uploadLogo(id: string, file: File): Promise<{ logo_url: string; logo: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await apiClient.post(`/schools/schools/${id}/upload-logo/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async uploadBanner(id: string, file: File): Promise<{ banner_url: string; banner: string }> {
    const formData = new FormData();
    formData.append('banner', file);
    const { data } = await apiClient.post(`/schools/schools/${id}/upload-banner/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteSchool(id: string): Promise<void> {
    await apiClient.delete(API.SCHOOLS.DETAIL(id));
  },

  async toggleSchoolStatus(id: string, body?: Record<string, unknown>): Promise<School> {
    const { data } = await apiClient.post(API.SCHOOLS.TOGGLE_STATUS(id), body ?? {});
    return data;
  },

  async getSchoolStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.SCHOOLS.STATS);
    return data;
  },

  async getSchoolSettings(id: string): Promise<SchoolSettings> {
    const { data } = await apiClient.get(API.SCHOOLS.SETTINGS(id));
    return data;
  },

  async updateSchoolSettings(id: string, settings: Partial<SchoolSettings>): Promise<SchoolSettings> {
    const { data } = await apiClient.patch(API.SCHOOLS.SETTINGS(id), settings);
    return data;
  },
};
