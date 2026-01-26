import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { HelpCircle, Send, Phone, Mail, MapPin, CheckCircle } from "lucide-react";

export default function Help() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/help", { content });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      setSubmitted(true);
      toast({
        title: "Message Sent",
        description: "The admin will respond to you soon.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pt-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary flex items-center gap-3" data-testid="heading-help">
            <HelpCircle className="w-8 h-8" />
            Get Help
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-help-description">
            Need assistance? Contact the park management team.
          </p>
        </div>

        <div className="grid gap-6">
          <Card data-testid="card-contact-info">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-contact-title">Contact Information</CardTitle>
              <CardDescription data-testid="text-contact-description">Reach us directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-foreground" data-testid="contact-phone">
                <Phone className="w-5 h-5 text-primary" />
                <a href="tel:352-669-3141" className="hover:underline" data-testid="link-phone">352.669.3141</a>
              </div>
              <div className="flex items-center gap-3 text-foreground" data-testid="contact-email">
                <Mail className="w-5 h-5 text-primary" />
                <a href="mailto:omsmanagement86@gmail.com" className="hover:underline" data-testid="link-email">omsmanagement86@gmail.com</a>
              </div>
              <div className="flex items-center gap-3 text-foreground" data-testid="contact-address">
                <MapPin className="w-5 h-5 text-primary" />
                <span data-testid="text-address">1000 N. Central Ave, Umatilla, FL 32784</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-send-message">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-send-message-title">Send a Message</CardTitle>
              <CardDescription data-testid="text-send-message-description">
                Send a message directly to park management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8 space-y-4" data-testid="message-sent-confirmation">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-message-sent">Message Sent!</h3>
                    <p className="text-muted-foreground" data-testid="text-confirmation-description">
                      We'll get back to you as soon as possible.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSubmitted(false)}
                    data-testid="button-send-another"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    placeholder="Describe your question or concern..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="resize-none"
                    data-testid="textarea-help-message"
                  />
                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={!message.trim() || sendMessage.isPending}
                    data-testid="button-send-help"
                  >
                    {sendMessage.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20" data-testid="card-office-hours">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2" data-testid="text-office-hours-title">Office Hours</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-office-hours">
                Monday - Friday: 9:00 AM - 5:00 PM<br />
                Saturday: 10:00 AM - 2:00 PM<br />
                Sunday: Closed
              </p>
              <p className="text-sm text-muted-foreground mt-3" data-testid="text-emergency-info">
                For emergencies outside office hours, please call 911.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
