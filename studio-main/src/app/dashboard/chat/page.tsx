"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Search,
  User,
  MessageCircle,
  MoreVertical,
  ArrowLeft,
  Crown,
  Loader2,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingError, setIsLoadingError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isExecutive = ["SUPER_ADMIN", "CEO", "CTO", "COO", "INV", "DESIGNER"].includes(user?.role || "");

  // Load contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setIsLoadingError(false);
        const response = await fetch("/api/conversations", {
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error("Failed to load conversations");
        const data = await response.json();
        setContacts(data.conversations || []);
      } catch (error) {
        console.error("Error loading contacts:", error);
        setIsLoadingError(true);
        toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
      } finally {
        setIsLoadingContacts(false);
      }
    };

    loadContacts();
  }, [toast]);

  // Load messages when contact changes
  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        setIsLoadingError(false);
        const response = await fetch(`/api/conversations/${selectedContact.id}/messages`, {
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error("Failed to load messages");
        const data = await response.json();
        setMessages(data.messages || []);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error("Error loading messages:", error);
        setIsLoadingError(true);
        toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedContact, toast]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!selectedContact) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/chat/${selectedContact.id}`
    );

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [selectedContact?.id]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedContact) return;

    const tempMessage = {
      id: `temp_${Date.now()}`,
      senderId: user?.uid,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isOfficial: false
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageText("");
    setIsSending(true);

    try {
      // Try to send via REST if WS not connected
      const response = await fetch(`/api/conversations/${selectedContact.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText })
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? data.message : msg))
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }, [messageText, selectedContact, user?.uid, toast]);

  const handleRetry = () => {
    setIsLoadingError(false);
    if (selectedContact) {
      const loadMessages = async () => {
        try {
          setIsLoadingMessages(true);
          const response = await fetch(`/api/conversations/${selectedContact.id}/messages`);
          if (!response.ok) throw new Error("Failed to load messages");
          const data = await response.json();
          setMessages(data.messages || []);
        } catch (error) {
          console.error("Error loading messages:", error);
          toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
        } finally {
          setIsLoadingMessages(false);
        }
      };
      loadMessages();
    }
  };

  if (user?.role === "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <MessageCircle className="w-16 h-16 text-primary/20" />
        <h1 className="text-2xl font-bold">Platform Management Only</h1>
        <p className="text-muted-foreground text-sm max-w-xs">Participate in chats via the Founder accounts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-3 leading-none">
            {isExecutive ? <Crown className="w-6 h-6 text-secondary" /> : <MessageCircle className="w-6 h-6 text-secondary" />}
            {isExecutive ? "Board Chat" : t("chat")}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Contact List */}
        <Card className={cn("w-full md:w-80 flex flex-col border-none shadow-sm shrink-0 overflow-hidden bg-white", selectedContact && "hidden md:flex")}>
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 bg-accent/30 border-none rounded-xl text-sm h-10" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            {isLoadingContacts ? (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 text-muted-foreground mx-auto animate-spin" />
              </div>
            ) : isLoadingError ? (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-destructive mx-auto" />
                <p className="text-xs text-muted-foreground">Failed to load conversations</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No conversations yet</div>
            ) : (
              <div className="p-2 space-y-1">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group", selectedContact?.id === contact.id ? "bg-primary text-white shadow-lg" : "hover:bg-accent/50")}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback>{contact.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      {contact.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm truncate">{contact.name}</span>
                      </div>
                      <p className={cn("text-[10px] truncate", selectedContact?.id === contact.id ? "text-white/70" : "text-muted-foreground")}>
                        {contact.lastMsg || "No messages yet"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className={cn("flex-1 flex flex-col border-none shadow-sm relative overflow-hidden bg-white/50 rounded-[2rem]", !selectedContact && "hidden md:flex")}>
          {selectedContact ? (
            <>
              <div className="p-3 md:p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedContact(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedContact.avatar} />
                    <AvatarFallback>{selectedContact.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-primary">{selectedContact.name}</h3>
                    <p className="text-[9px] text-muted-foreground uppercase font-black">
                      {wsConnected ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                ) : isLoadingError ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <p className="text-xs text-muted-foreground text-center">Failed to load messages</p>
                    <Button size="sm" variant="outline" onClick={handleRetry}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn("flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2", msg.senderId === user?.uid ? "ml-auto items-end" : "items-start")}
                      >
                        <div
                          className={cn("p-3 md:p-4 rounded-2xl text-sm shadow-sm", msg.senderId === user?.uid ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border border-accent")}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 md:p-4 bg-white border-t shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Message..."
                    className="flex-1 bg-accent/30 border-none h-11 text-sm rounded-xl"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    className="h-11 w-11 rounded-xl bg-primary text-white"
                    onClick={handleSendMessage}
                    disabled={isSending || !messageText.trim()}
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary/20" />
              </div>
              <h3 className="font-black text-lg text-primary uppercase">{t("chat")}</h3>
              <p className="text-muted-foreground text-xs">{t("selectContact")}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
