import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useCallback, useRef, useState, useEffect } from 'react';
import { chatService } from '@/lib/api/services/chat.service';
import { BASE_URL } from '@/lib/api/client';
import { getAccessToken } from '@/lib/auth';
import type {
  Conversation,
  Message,
  GetOrCreateDirectRequest,
  SendMessageRequest,
  MarkConversationReadRequest,
  PaginationParams,
} from '@/lib/api/types';

// Query Key Factory
const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string) =>
    [...chatKeys.all, 'conversation', id] as const,
  messages: (convId: string) =>
    [...chatKeys.all, 'messages', convId] as const,
};

/**
 * Hook for fetching conversations
 */
export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: () => chatService.getConversations(),
  });
}

/**
 * Hook for fetching a single conversation
 */
export function useConversation(id: string) {
  return useQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: () => chatService.getConversation(id),
    enabled: !!id,
  });
}

/**
 * Hook for fetching messages with cursor pagination
 */
export function useMessages(
  convId: string,
  params?: PaginationParams
) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(convId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      chatService.getMessages(convId, {
        ...params,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    enabled: !!convId,
  });
}

/**
 * Hook for getting or creating a direct conversation
 */
export function useGetOrCreateDirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GetOrCreateDirectRequest) =>
      chatService.getOrCreateDirect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

/**
 * Hook for sending a message
 * Appends message to cache optimistically
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) =>
      chatService.sendMessage(data),
    onSuccess: (response, variables) => {
      const conversationId = variables.conversation_id ?? variables.conversationId ?? "";
      // Optimistically update cache
      queryClient.setQueryData(
        chatKeys.messages(conversationId),
        (oldData: any) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any, idx: number) => {
              if (idx === 0) {
                return {
                  ...page,
                  results: [response, ...page.results],
                };
              }
              return page;
            }),
          };
        }
      );

      // Invalidate conversations to update last message
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(),
      });
    },
  });
}

/**
 * Hook for marking a conversation as read
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkConversationReadRequest) =>
      chatService.markConversationRead(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversation(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

/**
 * Hook for deleting a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chatService.deleteMessage(id),
    onSuccess: () => {
      // Invalidate all message queries
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

/**
 * WebSocket hook for real-time chat messages
 * Manages WebSocket connection for a specific conversation
 */
export function useChatWebSocket(
  conversationId: string | null,
  onMessage: (msg: any) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const token = getAccessToken();

  useEffect(() => {
    if (!conversationId || !token) return;

    let wsBase = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsBase) {
      try {
        const apiUrl = new URL(BASE_URL);
        apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        apiUrl.pathname = '';
        apiUrl.search = '';
        apiUrl.hash = '';
        wsBase = apiUrl.toString().replace(/\/$/, '');
      } catch {
        wsBase = 'ws://localhost:8000';
      }
    }

    const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data?.data ?? data?.message ?? data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [conversationId, token]);

  const sendWsMessage = useCallback((data: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    }
  }, []);

  return { isConnected, sendWsMessage };
}
