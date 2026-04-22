"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  ArrowLeft,
  Crown,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { chatService } from "@/lib/api/services/chat.service";
import { usersService } from "@/lib/api/services/users.service";
import { resolveMediaUrl } from "@/lib/media";

const normalizeList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const parseDRFError = (err: any): string => {
  if (!err?.response) return err?.message || "Network error. Please check your connection.";
  const status = err.response.status;
  const data = err.response.data;
  if (!data) return `HTTP ${status}`;
  if (typeof data === "string") return `${status}: ${data}`;
  if (data.detail) return `${status}: ${data.detail}`;
  if (typeof data === "object") {
    return `${status}: ${Object.entries(data)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" | ")}`;
  }
  return `HTTP ${status}`;
};

const getParticipantId = (participant: any) => participant.user_id ?? participant.id;
const getParticipantName = (participant: any) => participant.user_name ?? participant.name;
const getParticipantAvatar = (participant: any) => resolveMediaUrl(participant.user_avatar ?? participant.avatar);

const getMessageSenderId = (message: any) => message.sender_id ?? message.sender?.id;
const getMessageSenderName = (message: any) => message.sender_name ?? message.sender?.name;
const getMessageSenderAvatar = (message: any) =>
  resolveMediaUrl(message.sender_avatar ?? message.sender?.avatar);

const getConversationDisplay = (conversation: any, currentUserId: any) => {
  if (conversation.conversation_type === "direct") {
    const other =
      (conversation.participants || []).find(
        (participant: any) => String(getParticipantId(participant)) !== String(currentUserId)
      ) ?? conversation.participants?.[0];
    return {
      name: other ? getParticipantName(other) : conversation.name || "Unknown",
      avatar: other ? getParticipantAvatar(other) : "",
    };
  }

  return {
    name: conversation.name || "Group Chat",
    avatar: "",
  };
};

export default function ChatPage() {
  const { user } = useAuth();
  const { t, translateText } = useI18n();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [convsErrorMsg, setConvsErrorMsg] = useState<string | null>(null);
  const [msgsErrorMsg, setMsgsErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  const isExecutive = ["SUPER_ADMIN", "CEO", "CTO", "COO", "INV", "DESIGNER"].includes(user?.role || "");

  const scrollToBottom = () => {
    window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 80);
  };

  const loadConversations = useCallback(async () => {
    setIsLoadingConvs(true);
    setConvsErrorMsg(null);
    try {
      const result = await chatService.getConversations();
      setConversations(normalizeList(result));
    } catch (err: any) {
      setConvsErrorMsg(parseDRFError(err));
      console.error("[Chat] Failed to load conversations:", err?.response ?? err);
    } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, quiet = false) => {
    if (!quiet) setIsLoadingMsgs(true);
    setMsgsErrorMsg(null);
    try {
      const result = await chatService.getMessages(conversationId);
      const loaded = normalizeList(result).reverse();
      setMessages((prev) => {
        const loadedIds = new Set(loaded.map((message: any) => String(message.id)));
        const pending = prev.filter((message: any) => message._pending && !loadedIds.has(String(message.id)));
        return [...loaded, ...pending];
      });
      setLastSyncedAt(new Date());
      scrollToBottom();
    } catch (err: any) {
      if (!quiet) setMsgsErrorMsg(parseDRFError(err));
      console.error("[Chat] Failed to load messages:", err?.response ?? err);
    } finally {
      if (!quiet) setIsLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      setLastSyncedAt(null);
      return;
    }
    loadMessages(String(selectedConv.id));
  }, [selectedConv, loadMessages]);

  useEffect(() => {
    if (!selectedConv) return;
    const interval = window.setInterval(() => {
      loadMessages(String(selectedConv.id), true);
      loadConversations();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [selectedConv?.id, loadMessages, loadConversations]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !selectedConv) return;

    const text = messageText.trim();
    const tempId = `tmp_${Date.now()}`;
    setMessageText("");

    const optimisticMessage = {
      id: tempId,
      sender_id: user?.id,
      sender_name: user?.name,
      sender_avatar: user?.avatar,
      text,
      created_at: new Date().toISOString(),
      is_official: isExecutive,
      _pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();
    setIsSending(true);

    try {
      const sent = await chatService.sendMessage(String(selectedConv.id), {
        text,
        conversation_id: String(selectedConv.id),
      } as any);
      setMessages((prev) => prev.map((message) => (message.id === tempId ? sent : message)));
      setLastSyncedAt(new Date());
      loadConversations();
    } catch (err: any) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      setMessageText(text);
      toast({ variant: "destructive", title: "Send failed", description: parseDRFError(err) });
      console.error("[Chat] Send message error:", err?.response ?? err);
    } finally {
      setIsSending(false);
    }
  }, [messageText, selectedConv, user, isExecutive, toast, loadConversations]);

  const loadAvailableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const result = await usersService.getUsers();
      setAvailableUsers(normalizeList(result).filter((record: any) => String(record.id) !== String(user?.id)));
    } catch (err) {
      setAvailableUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [user?.id]);

  const handleOpenNewChat = () => {
    setUserSearch("");
    setNewChatOpen(true);
    loadAvailableUsers();
  };

  const handleStartConversation = async (targetUser: any) => {
    setIsStartingChat(String(targetUser.id));
    try {
      const conversation = await chatService.getOrCreateDirect(String(targetUser.id));
      await loadConversations();
      setSelectedConv(conversation);
      setNewChatOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not start conversation", description: parseDRFError(err) });
    } finally {
      setIsStartingChat(null);
    }
  };

  const filteredUsers = availableUsers.filter((record: any) => {
    const query = userSearch.toLowerCase();
    return (
      !query ||
      (record.name || "").toLowerCase().includes(query) ||
      (record.email || "").toLowerCase().includes(query) ||
      (record.role || "").toLowerCase().includes(query)
    );
  });

  const currentConversationDisplay = selectedConv ? getConversationDisplay(selectedConv, user?.id) : null;
  const syncLabel = lastSyncedAt ? translateText("Active sync") : translateText("Sync pending");

  if (user?.role === "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <MessageCircle className="w-16 h-16 text-primary/20" />
        <h1 className="text-2xl font-bold">Platform Management Only</h1>
        <p className="text-muted-foreground text-sm max-w-xs">Participate in chats via Founder accounts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-3 leading-none">
          {isExecutive ? <Crown className="w-6 h-6 text-secondary" /> : <MessageCircle className="w-6 h-6 text-secondary" />}
          {isExecutive ? "Board Chat" : t("chat")}
        </h1>
        <Button size="sm" onClick={handleOpenNewChat} className="gap-2 rounded-xl bg-primary text-white font-bold shadow-md">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-primary uppercase tracking-tight">
              <Users className="w-5 h-5 text-secondary" />
              Start a Conversation
            </DialogTitle>
            <DialogDescription className="text-xs">Select a person to start a direct message conversation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or role..."
                className="pl-9 bg-accent/30 border-none rounded-xl text-sm h-10"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
            </div>
            <ScrollArea className="h-72">
              {isLoadingUsers && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary/30" />
                </div>
              )}
              {!isLoadingUsers && filteredUsers.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {userSearch ? "No users match your search." : "No users available."}
                </div>
              )}
              <div className="space-y-1 pr-2">
                {filteredUsers.map((record: any) => (
                  <button
                    key={record.id}
                    onClick={() => handleStartConversation(record)}
                    disabled={isStartingChat === String(record.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all text-left group"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={resolveMediaUrl(record.avatar) || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(record.name || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-sm text-primary truncate">{record.name || "Unknown"}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[8px] h-3.5 py-0 font-black uppercase bg-secondary/20 text-primary border-none">
                          {record.role}
                        </Badge>
                        {record.email && <span className="text-[10px] text-muted-foreground truncate">{record.email}</span>}
                      </div>
                    </div>
                    {isStartingChat === String(record.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary/40 shrink-0" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-primary/20 group-hover:text-primary/60 transition-colors shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        <Card className={cn("w-full md:w-80 flex flex-col border-none shadow-sm shrink-0 overflow-hidden bg-white", selectedConv && "hidden md:flex")}>
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9 bg-accent/30 border-none rounded-xl text-sm h-10" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            {isLoadingConvs && (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
              </div>
            )}
            {convsErrorMsg && !isLoadingConvs && (
              <div className="p-4 text-center space-y-3">
                <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
                <p className="text-xs font-bold text-destructive">{translateText("Failed to load conversations")}</p>
                <p className="text-[10px] text-muted-foreground bg-destructive/5 rounded-lg p-2 text-left font-mono break-all">{convsErrorMsg}</p>
                <Button size="sm" variant="outline" onClick={loadConversations} className="gap-2">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            )}
            {!isLoadingConvs && !convsErrorMsg && conversations.length === 0 && (
              <div className="p-6 text-center space-y-2">
                <MessageCircle className="w-8 h-8 text-primary/20 mx-auto" />
                <p className="text-xs text-muted-foreground">{t("noConversations")}</p>
                <Button size="sm" variant="outline" onClick={handleOpenNewChat} className="gap-2 mt-2">
                  <Plus className="w-3 h-3" /> Start a chat
                </Button>
              </div>
            )}
            <div className="p-2 space-y-1">
              {conversations.map((conversation: any) => {
                const display = getConversationDisplay(conversation, user?.id);
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConv(conversation)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                      selectedConv?.id === conversation.id ? "bg-primary text-white shadow-lg" : "hover:bg-accent/50"
                    )}
                  >
                    <Avatar className="h-10 w-10 border border-white/20">
                      <AvatarImage src={display.avatar || ""} />
                      <AvatarFallback>{display.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm truncate">{display.name}</span>
                        {conversation.unread_count > 0 && (
                          <Badge className="h-4 w-4 p-0 text-[9px] bg-secondary text-primary border-none rounded-full justify-center">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className={cn("text-[10px] truncate", selectedConv?.id === conversation.id ? "text-white/70" : "text-muted-foreground")}>
                        {conversation.last_message ? translateText(conversation.last_message) : translateText("No messages yet")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card className={cn("flex-1 flex flex-col border-none shadow-sm relative overflow-hidden bg-white/50 rounded-[2rem]", !selectedConv && "hidden md:flex")}>
          {selectedConv ? (
            <>
              <div className="p-3 md:p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentConversationDisplay?.avatar || ""} />
                    <AvatarFallback>{currentConversationDisplay?.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-primary">{currentConversationDisplay?.name}</h3>
                    <p className="text-[9px] text-muted-foreground uppercase font-black">{syncLabel}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef as any}>
                {isLoadingMsgs && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
                  </div>
                )}
                {msgsErrorMsg && !isLoadingMsgs && (
                  <div className="flex flex-col items-center py-8 gap-3 px-4">
                    <AlertCircle className="w-8 h-8 text-destructive/30" />
                    <p className="text-xs font-bold text-destructive">{translateText("Failed to load messages")}</p>
                    <p className="text-[10px] text-muted-foreground bg-destructive/5 rounded-lg p-2 w-full font-mono break-all">{msgsErrorMsg}</p>
                    <Button size="sm" variant="outline" onClick={() => loadMessages(String(selectedConv.id))} className="gap-2">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </Button>
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map((message: any) => {
                    const isOwn = String(getMessageSenderId(message)) === String(user?.id);
                    const senderName = getMessageSenderName(message);
                    return (
                      <div key={message.id} className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
                        {!isOwn && (
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={getMessageSenderAvatar(message) || ""} />
                            <AvatarFallback className="text-[10px]">{senderName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("max-w-[75%] space-y-1", isOwn ? "items-end" : "items-start")}>
                          {!isOwn && <p className="text-[9px] font-bold text-muted-foreground px-1">{senderName}</p>}
                          <div
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
                              message.is_official
                                ? "bg-primary/10 border border-primary/20 text-primary"
                                : isOwn
                                  ? "bg-primary text-white rounded-br-sm"
                                  : "bg-white border border-accent text-primary rounded-bl-sm shadow-sm",
                              message._pending && "opacity-60"
                            )}
                          >
                            {translateText(message.text)}
                          </div>
                          <p className={cn("text-[9px] text-muted-foreground px-1", isOwn && "text-right")}>
                            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-3 md:p-4 border-t bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-accent/30 border-none rounded-2xl h-11 text-sm"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || isSending}
                    size="icon"
                    className="h-11 w-11 rounded-2xl bg-primary text-white shadow-lg shrink-0"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-8">
              <div className="p-6 bg-primary/5 rounded-full">
                <MessageCircle className="w-12 h-12 text-primary/20" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Select a Conversation</h3>
                <p className="text-sm text-muted-foreground mt-1">Choose from your conversations on the left, or start a new one.</p>
              </div>
              <Button onClick={handleOpenNewChat} className="gap-2 rounded-xl" variant="outline">
                <Plus className="w-4 h-4" /> New Chat
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
