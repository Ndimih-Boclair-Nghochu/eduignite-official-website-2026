import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Feedback,
  PaginatedResponse,
  ListParams,
  CreateFeedbackRequest,
} from '../types';

export const feedbackService = {
  async getFeedbacks(params?: ListParams): Promise<PaginatedResponse<Feedback>> {
    const { data } = await apiClient.get(API.FEEDBACK.BASE, { params });
    return data;
  },

  async getFeedback(id: string): Promise<Feedback> {
    const { data } = await apiClient.get(API.FEEDBACK.DETAIL(id));
    return data;
  },

  async getMyFeedbacks(params?: ListParams): Promise<PaginatedResponse<Feedback>> {
    const { data } = await apiClient.get(API.FEEDBACK.MY_FEEDBACK, { params });
    return data;
  },

  async createFeedback(feedbackData: CreateFeedbackRequest): Promise<Feedback> {
    const { data } = await apiClient.post(API.FEEDBACK.BASE, feedbackData);
    return data;
  },

  async updateFeedback(id: string, feedbackData: Partial<CreateFeedbackRequest>): Promise<Feedback> {
    const { data } = await apiClient.patch(API.FEEDBACK.DETAIL(id), feedbackData);
    return data;
  },

  async resolveFeedback(id: string, note: string): Promise<Feedback> {
    const { data } = await apiClient.post(API.FEEDBACK.RESOLVE(id), { note });
    return data;
  },

  async respondToFeedback(id: string, message: string): Promise<Feedback> {
    const { data } = await apiClient.post(API.FEEDBACK.RESPOND(id), { message });
    return data;
  },

  async getFeedbackStats(): Promise<any> {
    const { data } = await apiClient.get(API.FEEDBACK.STATS);
    return data;
  },
};
