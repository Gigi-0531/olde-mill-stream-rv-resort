import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Users, MessageCircle, Loader2, Search, ChevronLeft, Camera } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  profilePicture?: string | null;
  role: string;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: communityMessages, isLoading: communityLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/community"],
    refetchInterval: 5000,
  });

  const { data: directMessages, isLoading: directLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/direct"],
    refetchInterval: 5000,
  });

  const { data: residents, isLoading: residentsLoading, error: residentsError } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load contacts");
      }
      return res.json();
    },
    retry: 2,
    staleTime: 0,
    enabled: !!user,
  });

  const { data: conversation } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; recipientId?: number }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.reason || error.message || "Failed to send message");
      }
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
    onError: (error: Error) => {
      toast({
        title: "Message blocked",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [communityMessages, conversation]);

  const handleSendCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage.mutate({ content: newMessage }, {
      onSuccess: () => {
        if (user?.role !== 'admin') {
          toast({
            title: "Message submitted",
            description: "Your message will appear after admin approval.",
          });
        }
      }
    });
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

  const getProfilePicture = (userId: number) => {
    if (userId === user?.id) return null;
    const resident = residents?.find(r => r.id === userId);
    return resident?.profilePicture || null;
  };

  const getLastMessage = (partnerId: number) => {
    if (!directMessages) return null;
    const msgs = directMessages.filter(
      m => m.senderId === partnerId || m.recipientId === partnerId
    );
    return msgs[0];
  };

  const getConversationPartners = () => {
    if (!directMessages || !user) return [];
    const partnerMap = new Map<number, { lastMessage: Message }>();
    directMessages.forEach(m => {
      const partnerId = m.senderId !== user.id ? m.senderId : m.recipientId;
      if (partnerId && partnerId !== user.id) {
        if (!partnerMap.has(partnerId) || new Date(m.createdAt) > new Date(partnerMap.get(partnerId)!.lastMessage.createdAt)) {
          partnerMap.set(partnerId, { lastMessage: m });
        }
      }
    });
    return Array.from(partnerMap.entries()).sort((a, b) => 
      new Date(b[1].lastMessage.createdAt).getTime() - new Date(a[1].lastMessage.createdAt).getTime()
    );
  };

  const filteredResidents = residents?.filter(r => {
    if (r.id === user?.id) return false;
    if (!searchQuery) return true;
    const name = r.firstName ? `${r.firstName} ${r.lastName}` : r.lastName || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           r.lotNumber?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedUser = residents?.find(r => r.id === selectedUserId);

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
        <Tabs defaultValue="direct" className="w-full">
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
                          {getProfilePicture(msg.senderId) && (
                            <AvatarImage src={getProfilePicture(msg.senderId)!} />
                          )}
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
            {selectedUserId ? (
              <Card className="flex flex-col h-[70vh]">
                <div className="flex items-center gap-3 p-3 border-b bg-card">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedUserId(null)}
                    data-testid="button-back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10">
                    {selectedUser?.profilePicture && (
                      <AvatarImage src={selectedUser.profilePicture} />
                    )}
                    <AvatarFallback>
                      {selectedUser?.firstName && selectedUser?.lastName
                        ? `${selectedUser.firstName[0]}${selectedUser.lastName[0]}`
                        : selectedUser?.lastName?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {selectedUser?.firstName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : selectedUser?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lot {selectedUser?.lotNumber}
                    </p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {conversation?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.senderId === user?.id ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {getProfilePicture(msg.senderId) && (
                            <AvatarImage src={getProfilePicture(msg.senderId)!} />
                          )}
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
                    placeholder="Message..."
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
              </Card>
            ) : (
              <Card className="h-[70vh] flex flex-col">
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search neighbors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-neighbors"
                    />
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="divide-y">
                    {residentsLoading && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                        <p>Loading contacts...</p>
                      </div>
                    )}
                    {residentsError && (
                      <div className="text-center py-12 text-destructive">
                        <p>Failed to load contacts. Please refresh the page.</p>
                      </div>
                    )}
                    {!residentsLoading && !residentsError && filteredResidents?.map((resident) => (
                      <button
                        key={resident.id}
                        onClick={() => setSelectedUserId(resident.id)}
                        className="w-full flex items-center gap-3 py-2.5 px-4 text-left transition-colors hover:bg-muted/50 bg-background"
                        data-testid={`select-user-${resident.id}`}
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          {resident.profilePicture && (
                            <AvatarImage src={resident.profilePicture} className="object-cover" />
                          )}
                          <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                            {resident.firstName && resident.lastName
                              ? `${resident.firstName[0]}${resident.lastName[0]}`
                              : resident.lastName?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-base truncate text-foreground">
                            {resident.firstName ? `${resident.firstName} ${resident.lastName}` : resident.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {resident.role === 'admin' ? 'Park Management' : `Lot ${resident.lotNumber}`}
                          </p>
                        </div>
                      </button>
                    ))}
                    {!residentsLoading && !residentsError && filteredResidents?.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No neighbors found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
