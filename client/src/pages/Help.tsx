import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle, Phone, Mail, MapPin, Home, Calendar, Image, MessageCircle, Map } from "lucide-react";

export default function Help() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pt-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary flex items-center gap-3" data-testid="heading-help">
            <HelpCircle className="w-8 h-8" />
            Get Help
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-help-description">
            Learn how to use the app and contact park management.
          </p>
        </div>

        <div className="grid gap-6">
          <Card data-testid="card-video-tutorial">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-video-title">How to Use This App</CardTitle>
              <CardDescription data-testid="text-video-description">Watch this quick tutorial to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4" data-testid="video-tutorial">
                <video 
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  data-testid="video-player"
                >
                  <source src="/app-tutorial.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold" data-testid="text-features-title">App Features</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg" data-testid="feature-home">
                    <Home className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Home</p>
                      <p className="text-xs text-muted-foreground">View weather, alerts, and upcoming activities</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg" data-testid="feature-map">
                    <Map className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Park Map</p>
                      <p className="text-xs text-muted-foreground">View the resort layout and find locations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg" data-testid="feature-activities">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Activities</p>
                      <p className="text-xs text-muted-foreground">See all scheduled park activities and events</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg" data-testid="feature-gallery">
                    <Image className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Gallery</p>
                      <p className="text-xs text-muted-foreground">Browse photos from park events</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg" data-testid="feature-messages">
                    <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Messages</p>
                      <p className="text-xs text-muted-foreground">Chat with neighbors and view community posts</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
