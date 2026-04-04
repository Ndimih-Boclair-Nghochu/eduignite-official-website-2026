import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Testimony,
  CommunityBlog,
  BlogComment,
  PaginatedResponse,
  ListParams,
} from '../types';

export const communityService = {
  async getTestimonies(params?: ListParams): Promise<PaginatedResponse<Testimony>> {
    const { data } = await apiClient.get(API.COMMUNITY.TESTIMONIES, { params });
    return data;
  },

  async getTestimony(id: string): Promise<Testimony> {
    const { data } = await apiClient.get(API.COMMUNITY.TESTIMONY_DETAIL(id));
    return data;
  },

  async getPendingTestimonies(params?: ListParams): Promise<PaginatedResponse<Testimony>> {
    const { data } = await apiClient.get(API.COMMUNITY.PENDING_TESTIMONIES, { params });
    return data;
  },

  async createTestimony(testimonyData: Partial<Testimony>): Promise<Testimony> {
    const { data } = await apiClient.post(API.COMMUNITY.TESTIMONIES, testimonyData);
    return data;
  },

  async approveTestimony(id: string): Promise<Testimony> {
    const { data } = await apiClient.post(API.COMMUNITY.APPROVE_TESTIMONY(id), {});
    return data;
  },

  async rejectTestimony(id: string, reason?: string): Promise<Testimony> {
    const { data } = await apiClient.post(API.COMMUNITY.REJECT_TESTIMONY(id), { reason });
    return data;
  },

  async getBlogs(params?: ListParams): Promise<PaginatedResponse<CommunityBlog>> {
    const { data } = await apiClient.get(API.COMMUNITY.BLOGS, { params });
    return data;
  },

  async getBlog(idOrSlug: string): Promise<CommunityBlog> {
    const { data } = await apiClient.get(API.COMMUNITY.BLOG_DETAIL(idOrSlug));
    return data;
  },

  async createBlog(blogData: Partial<CommunityBlog>): Promise<CommunityBlog> {
    const { data } = await apiClient.post(API.COMMUNITY.BLOGS, blogData);
    return data;
  },

  async updateBlog(id: string, blogData: Partial<CommunityBlog>): Promise<CommunityBlog> {
    const { data } = await apiClient.patch(API.COMMUNITY.BLOG_DETAIL(id), blogData);
    return data;
  },

  async publishBlog(id: string): Promise<CommunityBlog> {
    const { data } = await apiClient.post(API.COMMUNITY.PUBLISH_BLOG(id), {});
    return data;
  },

  async viewBlog(id: string): Promise<CommunityBlog> {
    const { data } = await apiClient.post(API.COMMUNITY.VIEW_BLOG(id), {});
    return data;
  },

  async deleteBlog(id: string): Promise<void> {
    await apiClient.delete(API.COMMUNITY.BLOG_DETAIL(id));
  },

  async getComments(blogId: string, params?: ListParams): Promise<PaginatedResponse<BlogComment>> {
    const { data } = await apiClient.get(API.COMMUNITY.COMMENTS, {
      params: { ...params, blog: blogId },
    });
    return data;
  },

  async getComment(id: string): Promise<BlogComment> {
    const { data } = await apiClient.get(API.COMMUNITY.COMMENT_DETAIL(id));
    return data;
  },

  async createComment(blogId: string, content: string): Promise<BlogComment> {
    const { data } = await apiClient.post(API.COMMUNITY.COMMENTS, {
      blog: blogId,
      content,
    });
    return data;
  },

  async deleteComment(id: string): Promise<void> {
    await apiClient.delete(API.COMMUNITY.COMMENT_DETAIL(id));
  },
};
