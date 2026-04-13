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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { chatService } from "@/lib/api/services/chat.service";

const normalizeList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

// Derive a display name + avatar from a conversation object
const getConversationDisplay = (conv: any, currentUserId: any) => {
  if (conv.conversation_type === "direct") {
    const other = (conv.participants || []).find(
      (p: any) => String(p.id) !== String(currentUserId)
    ) ?? conv.participants?.[0];
    return {
      name: other?.name || conv.name || "Unknown",
      avatar: other?.avatar || null,
    };
  }
  return { name: conv.name || "Group Chat", avatar: null };
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
  const [msgsError, setMsgsError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
    try {
      const result = await chatService.getConversations();
      setConversations(normalizeList(result));
    } catch {
      setConvsError(true);
    } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when conversation changes
  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMsgs(true);
    setMsgsError(false);
    try {
      const result = await chatService.getMessages(convId);
      const list = normalizeList(result);
      // Messages come newest-first from cursor pagination; reverse for display
      setMessages([...list].reverse());
      scrollToBottom();
    } catch {
      setMsgsError(true);
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

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/chat/${selectedConv.id}/`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" || data.message) {
          setMessages((prev) => [...prev, data.message ?? data]);
          scrollToBottom();
        }
      } catch {}
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
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
      setMessageText(text); // restore
    } finally {
      setIsSending(false);
    }
  }, [messageText, selectedConv, user, isExecutive, toast]);

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
      </div>

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
                <p className="text-xs text-muted-foreground">Failed to load conversations</p>
                <Button size="sm" variant="outline" onClick={loadConversations} className="gap-2">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            )}
            {!isLoadingConvs && !convsError && conversations.length === 0 && (
              <div className="p-6 text-center space-y-2">
                <MessageCircle className="w-8 h-8 text-primary/20 mx-auto" />
                <p className="text-xs text-muted-foreground">No conversations yet</p>
                <p className="text-[10px] text-muted-foreground/60">Start a new chat with a colleague</p>
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
                  <div className="flex flex-col items-center py-8 gap-3">
                    <AlertCircle className="w-8 h-8 text-destructive/30" />
                    <p className="text-xs text-muted-foreground">Failed to load messages</p>
                    <Button size="sm" variant="outline" onClick={() => loadMessages(String(selectedConv.id))} className="gap-2">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </Button>
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
                <p className="text-sm text-muted-foreground mt-1">Choose from your conversations on the left</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
