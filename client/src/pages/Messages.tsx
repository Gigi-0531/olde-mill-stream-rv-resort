import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Users, MessageCircle, Loader2 } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: communityMessages, isLoading: communityLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/community"],
    refetchInterval: 5000,
  });

  const { data: residents } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const sendMessage = useMutation({
    mutationFn: async (data: { content: string }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.reason || error.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/community"] });
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
  }, [communityMessages]);

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

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <div className="bg-[#4a7ab0] py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-display text-white flex items-center gap-2" data-testid="text-page-title">
            <MessageCircle className="w-7 h-7" />
            Community Board
          </h1>
          <p className="text-primary-foreground/80" data-testid="text-page-subtitle">Stay connected with your neighbors</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <Card className="flex flex-col h-[70vh]" data-testid="card-community-messages">
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
                <p data-testid="text-empty-state">No community messages yet.</p>
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
      </div>
    </div>
  );
}
