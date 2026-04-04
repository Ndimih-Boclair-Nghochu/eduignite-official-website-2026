import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Conversation,
  Message,
  PaginatedResponse,
  ListParams,
  SendMessageRequest,
} from '../types';

export const chatService = {
  async getConversations(params?: ListParams): Promise<PaginatedResponse<Conversation>> {
    const { data } = await apiClient.get(API.CHAT.CONVERSATIONS, { params });
    return data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const { data } = await apiClient.get(API.CHAT.CONVERSATION_DETAIL(id));
    return data;
  },

  async getOrCreateDirect(userId: string): Promise<Conversation> {
    const { data } = await apiClient.get(API.CHAT.DIRECT(userId));
    return data;
  },

  async getMessages(
    conversationId: string,
    params?: ListParams
  ): Promise<PaginatedResponse<Message>> {
    const { data } = await apiClient.get(API.CHAT.MESSAGES(conversationId), { params });
    return data;
  },

  async sendMessage(
    conversationId: string,
    messageData: SendMessageRequest
  ): Promise<Message> {
    const { data } = await apiClient.post(API.CHAT.MESSAGES(conversationId), messageData);
    return data;
  },

  async markConversationRead(conversationId: string): Promise<Conversation> {
    const { data } = await apiClient.post(API.CHAT.MARK_READ(conversationId), {});
    return data;
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await apiClient.delete(API.CHAT.DELETE_MESSAGE(conversationId, messageId));
  },
};
