"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Send,
  Search,
  MessageCircle,
  MoreVertical,
  ArrowLeft,
  Crown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { chatService } from "@/lib/api/services/chat.service";
import { usersService } from "@/lib/api/services/users.service";
import { BASE_URL } from "@/lib/api/client";

const normalizeList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const parseDRFError = (err: any): string => {
  if (!err?.response) return err?.message || "Network error — is the backend running?";
  const s = err.response.status;
  const d = err.response.data;
  if (!d) return `HTTP ${s}`;
  if (typeof d === "string") return `${s}: ${d}`;
  if (d.detail) return `${s}: ${d.detail}`;
  if (typeof d === "object") {
    const parts = Object.entries(d)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : String(v)}`)
      .join(" | ");
    return `${s}: ${parts}`;
  }
  return `HTTP ${s}`;
};

// Derive a display name + avatar from a conversation object.
// ConversationListSerializer returns participants as {id, name, avatar}
// ConversationDetailSerializer returns participants as {user_id, user_name, user_avatar, ...}
const getParticipantId = (p: any) => p.user_id ?? p.id;
const getParticipantName = (p: any) => p.user_name ?? p.name;
const getParticipantAvatar = (p: any) => p.user_avatar ?? p.avatar ?? null;

const getConversationDisplay = (conv: any, currentUserId: any) => {
  if (conv.conversation_type === "direct") {
    const other = (conv.participants || []).find(
      (p: any) => String(getParticipantId(p)) !== String(currentUserId)
    ) ?? conv.participants?.[0];
    return {
      name: other ? getParticipantName(other) : (conv.name || "Unknown"),
      avatar: other ? getParticipantAvatar(other) : null,
    };
  }
  return { name: conv.name || "Group Chat", avatar: null };
};

const getWebSocketBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;

  try {
    const apiUrl = new URL(BASE_URL);
    apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    apiUrl.pathname = "";
    apiUrl.search = "";
    apiUrl.hash = "";
    return apiUrl.toString().replace(/\/$/, "");
  } catch {
    return "ws://localhost:8000";
  }
};

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [convsError, setConvsError] = useState(false);
  const [convsErrorMsg, setConvsErrorMsg] = useState<string | null>(null);
  const [msgsError, setMsgsError] = useState(false);
  const [msgsErrorMsg, setMsgsErrorMsg] = useState<string | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // New conversation dialog state
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  const isExecutive = ["SUPER_ADMIN", "CEO", "CTO", "COO", "INV", "DESIGNER"].includes(
    user?.role || ""
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoadingConvs(true);
    setConvsError(false);
    setConvsErrorMsg(null);
    try {
      const result = await chatService.getConversations();
      setConversations(normalizeList(result));
    } catch (err: any) {
      setConvsError(true);
      setConvsErrorMsg(parseDRFError(err));
      console.error("[Chat] Failed to load conversations:", err?.response ?? err);
    } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when conversation changes
  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMsgs(true);
    setMsgsError(false);
    setMsgsErrorMsg(null);
    try {
      const result = await chatService.getMessages(convId);
      const list = normalizeList(result);
      // Messages come newest-first from cursor pagination; reverse for display
      setMessages([...list].reverse());
      scrollToBottom();
    } catch (err: any) {
      setMsgsError(true);
      setMsgsErrorMsg(parseDRFError(err));
      console.error("[Chat] Failed to load messages:", err?.response ?? err);
    } finally {
      setIsLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedConv) { setMessages([]); return; }
    loadMessages(String(selectedConv.id));
  }, [selectedConv, loadMessages]);

  // WebSocket for real-time messages
  useEffect(() => {
    if (!selectedConv) return;
    wsRef.current?.close();
    setWsError(null);

    const token = (typeof window !== "undefined"
      ? localStorage.getItem("eduignite_access_token") || localStorage.getItem("access_token")
      : null) || "";

    if (!token) {
      setWsError("No auth token found — please log out and log in again.");
      return;
    }

    const wsBase = getWebSocketBaseUrl();
    const wsUrl = `${wsBase}/ws/chat/${selectedConv.id}/?token=${token}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err: any) {
      setWsError(`WebSocket construction failed: ${err?.message}`);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => { setWsConnected(true); setWsError(null); };
    ws.onclose = (event) => {
      setWsConnected(false);
      if (event.code === 4001) setWsError("WebSocket auth failed (4001) — token invalid or expired.");
      else if (event.code === 4002) setWsError("WebSocket rejected (4002) — not a participant in this conversation.");
      else if (event.code !== 1000) setWsError(`WebSocket closed (code ${event.code}): ${event.reason || "no reason"}`);
    };
    ws.onerror = () => {
      setWsConnected(false);
      setWsError("WebSocket connection error — check that NEXT_PUBLIC_WS_URL is set correctly and the backend is running.");
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const payload = data?.data ?? data?.message ?? data;
        if (data.type === "message" || data.message || data.data) {
          setMessages((prev) => [...prev, payload]);
          scrollToBottom();
        }
      } catch (parseErr) {
        console.error("[Chat WS] Failed to parse message:", event.data);
      }
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [selectedConv?.id]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !selectedConv) return;
    const text = messageText.trim();
    setMessageText("");

    const tempMsg = {
      id: `tmp_${Date.now()}`,
      sender_id: user?.id,
      sender_name: user?.name,
      sender_avatar: user?.avatar,
      text,
      created_at: new Date().toISOString(),
      is_official: isExecutive,
      _pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();
    setIsSending(true);

    try {
      const sent = await chatService.sendMessage(String(selectedConv.id), {
        text,
        conversation_id: String(selectedConv.id),
      } as any);
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? sent : m)));
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      toast({ variant: "destructive", title: "Send failed", description: parseDRFError(err) });
      console.error("[Chat] Send message error:", err?.response ?? err);
      setMessageText(text); // restore
    } finally {
      setIsSending(false);
    }
  }, [messageText, selectedConv, user, isExecutive, toast]);

  // Load available users for new conversation
  const loadAvailableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const result = await usersService.getUsers();
      const list = normalizeList(result).filter((u: any) => String(u.id) !== String(user?.id));
      setAvailableUsers(list);
    } catch {
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
      const conv = await chatService.getOrCreateDirect(String(targetUser.id));
      // Refresh conversations and select the new one
      await loadConversations();
      setSelectedConv(conv);
      setNewChatOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not start conversation", description: parseDRFError(err) });
      console.error("[Chat] Start conversation error:", err?.response ?? err);
    } finally {
      setIsStartingChat(null);
    }
  };

  const filteredUsers = availableUsers.filter((u: any) =>
    !userSearch.trim() ||
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  if (user?.role === "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <MessageCircle className="w-16 h-16 text-primary/20" />
        <h1 className="text-2xl font-bold">Platform Management Only</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Participate in chats via Founder accounts.
        </p>
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
        <Button
          size="sm"
          onClick={handleOpenNewChat}
          className="gap-2 rounded-xl bg-primary text-white font-bold shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-primary uppercase tracking-tight">
              <Users className="w-5 h-5 text-secondary" />
              Start a Conversation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a person to start a direct message conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or role..."
                className="pl-9 bg-accent/30 border-none rounded-xl text-sm h-10"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
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
                {filteredUsers.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartConversation(u)}
                    disabled={isStartingChat === String(u.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all text-left group"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={u.avatar || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(u.name || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-sm text-primary truncate">{u.name || "Unknown"}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[8px] h-3.5 py-0 font-black uppercase bg-secondary/20 text-primary border-none">
                          {u.role}
                        </Badge>
                        {u.email && (
                          <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                        )}
                      </div>
                    </div>
                    {isStartingChat === String(u.id) ? (
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
        {/* Conversation List */}
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
            {convsError && !isLoadingConvs && (
              <div className="p-4 text-center space-y-3">
                <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
                <p className="text-xs font-bold text-destructive">Failed to load conversations</p>
                {convsErrorMsg && (
                  <p className="text-[10px] text-muted-foreground bg-destructive/5 rounded-lg p-2 text-left font-mono break-all">{convsErrorMsg}</p>
                )}
                <Button size="sm" variant="outline" onClick={loadConversations} className="gap-2">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            )}
            {!isLoadingConvs && !convsError && conversations.length === 0 && (
              <div className="p-6 text-center space-y-2">
                <MessageCircle className="w-8 h-8 text-primary/20 mx-auto" />
                <p className="text-xs text-muted-foreground">No conversations yet</p>
                <Button size="sm" variant="outline" onClick={handleOpenNewChat} className="gap-2 mt-2">
                  <Plus className="w-3 h-3" /> Start a chat
                </Button>
              </div>
            )}
            <div className="p-2 space-y-1">
              {conversations.map((conv: any) => {
                const display = getConversationDisplay(conv, user?.id);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                      selectedConv?.id === conv.id ? "bg-primary text-white shadow-lg" : "hover:bg-accent/50"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={display.avatar || ""} />
                        <AvatarFallback>{display.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm truncate">{display.name}</span>
                        {conv.unread_count > 0 && (
                          <Badge className="h-4 w-4 p-0 text-[9px] bg-secondary text-primary border-none rounded-full justify-center">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className={cn("text-[10px] truncate", selectedConv?.id === conv.id ? "text-white/70" : "text-muted-foreground")}>
                        {conv.last_message || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className={cn("flex-1 flex flex-col border-none shadow-sm relative overflow-hidden bg-white/50 rounded-[2rem]", !selectedConv && "hidden md:flex")}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 md:p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  {(() => {
                    const d = getConversationDisplay(selectedConv, user?.id);
                    return (
                      <>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={d.avatar || ""} />
                          <AvatarFallback>{d.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-sm leading-tight text-primary">{d.name}</h3>
                          <p className="text-[9px] text-muted-foreground uppercase font-black">
                            {wsConnected ? "● Online" : "Offline"}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef as any}>
                {isLoadingMsgs && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
                  </div>
                )}
                {msgsError && !isLoadingMsgs && (
                  <div className="flex flex-col items-center py-8 gap-3 px-4">
                    <AlertCircle className="w-8 h-8 text-destructive/30" />
                    <p className="text-xs font-bold text-destructive">Failed to load messages</p>
                    {msgsErrorMsg && (
                      <p className="text-[10px] text-muted-foreground bg-destructive/5 rounded-lg p-2 w-full font-mono break-all">{msgsErrorMsg}</p>
                    )}
                    <Button size="sm" variant="outline" onClick={() => loadMessages(String(selectedConv.id))} className="gap-2">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </Button>
                  </div>
                )}
                {wsError && (
                  <div className="mx-auto max-w-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-amber-700">WebSocket Error</p>
                    <p className="text-[10px] text-amber-600 font-mono break-all">{wsError}</p>
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map((msg: any) => {
                    const isOwn = String(msg.sender_id) === String(user?.id);
                    return (
                      <div key={msg.id} className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
                        {!isOwn && (
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={msg.sender_avatar || ""} />
                            <AvatarFallback className="text-[10px]">{msg.sender_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("max-w-[75%] space-y-1", isOwn ? "items-end" : "items-start")}>
                          {!isOwn && (
                            <p className="text-[9px] font-bold text-muted-foreground px-1">{msg.sender_name}</p>
                          )}
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
                            msg.is_official
                              ? "bg-primary/10 border border-primary/20 text-primary"
                              : isOwn
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-white border border-accent text-primary rounded-bl-sm shadow-sm",
                            msg._pending && "opacity-60"
                          )}>
                            {msg.text}
                          </div>
                          <p className={cn("text-[9px] text-muted-foreground px-1", isOwn && "text-right")}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 md:p-4 border-t bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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
