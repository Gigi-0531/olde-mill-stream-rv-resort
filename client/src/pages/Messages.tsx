import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Users, MessageCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: number;
  senderId: number;
  recipientId: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  lotNumber?: string;
  role: string;
}

export default function Messages() {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: communityMessages, isLoading: communityLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/community"],
    refetchInterval: 5000,
  });

  const { data: directMessages, isLoading: directLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/direct"],
    refetchInterval: 5000,
  });

  const { data: residents } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: conversation } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; recipientId?: number }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/community"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/direct"] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      }
      setNewMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [communityMessages, conversation]);

  const handleSendCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage.mutate({ content: newMessage });
  };

  const handleSendDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;
    sendMessage.mutate({ content: newMessage, recipientId: selectedUserId });
  };

  const getSenderName = (senderId: number) => {
    if (senderId === user?.id) return "You";
    const sender = residents?.find(r => r.id === senderId);
    if (sender) {
      return sender.firstName 
        ? `${sender.firstName} ${sender.lastName}` 
        : `Lot ${sender.lotNumber} - ${sender.lastName}`;
    }
    return "Unknown";
  };

  const getInitials = (senderId: number) => {
    if (senderId === user?.id) return user?.lastName?.slice(0, 2).toUpperCase() || "ME";
    const sender = residents?.find(r => r.id === senderId);
    if (sender?.firstName && sender?.lastName) {
      return `${sender.firstName[0]}${sender.lastName[0]}`.toUpperCase();
    }
    return sender?.lastName?.slice(0, 2).toUpperCase() || "??";
  };

  const getConversationPartners = () => {
    if (!directMessages || !user) return [];
    const partnerIds = new Set<number>();
    directMessages.forEach(m => {
      if (m.senderId !== user.id) partnerIds.add(m.senderId);
      if (m.recipientId && m.recipientId !== user.id) partnerIds.add(m.recipientId);
    });
    return Array.from(partnerIds);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <div className="bg-[#4a7ab0] py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-display text-white flex items-center gap-2">
            <MessageCircle className="w-7 h-7" />
            Community Messages
          </h1>
          <p className="text-primary-foreground/80">Stay connected with your neighbors</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <Tabs defaultValue="community" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="community" className="flex-1 gap-2" data-testid="tab-community">
              <Users className="w-4 h-4" /> Community Board
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex-1 gap-2" data-testid="tab-direct">
              <MessageCircle className="w-4 h-4" /> Direct Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="community">
            <Card className="flex flex-col h-[60vh]">
              <ScrollArea className="flex-1 p-4">
                {communityLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : communityMessages && communityMessages.length > 0 ? (
                  <div className="space-y-4">
                    {[...communityMessages].reverse().map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.senderId === user?.id ? "flex-row-reverse" : ""}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className={msg.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}>
                            {getInitials(msg.senderId)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${msg.senderId === user?.id ? "text-right" : ""}`}>
                          <p className="text-xs text-muted-foreground mb-1">
                            {getSenderName(msg.senderId)} • {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                          </p>
                          <div
                            className={`inline-block p-3 rounded-lg ${
                              msg.senderId === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No community messages yet.</p>
                    <p className="text-sm">Be the first to say hello!</p>
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={handleSendCommunity} className="p-4 border-t flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Share something with the community..."
                  className="flex-1"
                  data-testid="input-community-message"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={sendMessage.isPending || !newMessage.trim()}
                  data-testid="button-send-community"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="direct">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 md:col-span-1">
                <h3 className="font-semibold mb-3">Neighbors</h3>
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-2">
                    {residents?.filter(r => r.id !== user?.id).map((resident) => (
                      <button
                        key={resident.id}
                        onClick={() => setSelectedUserId(resident.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors hover-elevate ${
                          selectedUserId === resident.id ? "bg-primary/10" : ""
                        }`}
                        data-testid={`select-user-${resident.id}`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {resident.firstName && resident.lastName
                              ? `${resident.firstName[0]}${resident.lastName[0]}`
                              : resident.lastName?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {resident.firstName ? `${resident.firstName} ${resident.lastName}` : resident.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">Lot {resident.lotNumber}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="flex flex-col h-[60vh] md:col-span-2">
                {selectedUserId ? (
                  <>
                    <div className="p-3 border-b">
                      <p className="font-semibold">
                        {residents?.find(r => r.id === selectedUserId)?.firstName
                          ? `${residents.find(r => r.id === selectedUserId)?.firstName} ${residents.find(r => r.id === selectedUserId)?.lastName}`
                          : residents?.find(r => r.id === selectedUserId)?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lot {residents?.find(r => r.id === selectedUserId)?.lotNumber}
                      </p>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {conversation?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.senderId === user?.id ? "flex-row-reverse" : ""}`}
                          >
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarFallback className={msg.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}>
                                {getInitials(msg.senderId)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[70%] ${msg.senderId === user?.id ? "text-right" : ""}`}>
                              <p className="text-xs text-muted-foreground mb-1">
                                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                              </p>
                              <div
                                className={`inline-block p-3 rounded-lg ${
                                  msg.senderId === user?.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <form onSubmit={handleSendDirect} className="p-4 border-t flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                        data-testid="input-direct-message"
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        disabled={sendMessage.isPending || !newMessage.trim()}
                        data-testid="button-send-direct"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a neighbor to start chatting</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
