import { useAuth } from "@/hooks/use-auth";
import { WeatherWidget } from "@/components/WeatherWidget";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { PermissionsPrompt } from "@/components/PermissionsPrompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Map, Calendar, ArrowRight, Navigation } from "lucide-react";
import resortImage from "@assets/facebook_1767649108158_7414057724947186807_1767655553163.jpg";
import parkMapImage from "@assets/resort-map.jpg";
import logoImg from "@/assets/logo.jpg";
import { useActivities } from "@/hooks/use-resources";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: activities } = useActivities();

  // Get next 3 activities
  const upcomingActivities = activities
    ?.filter(a => new Date(a.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <PermissionsPrompt />
      <div className="bg-[#4a7ab0] pb-32 pt-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display text-white mb-2">
            Welcome home {user?.lastName || 'Guest'} Family!
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Lot {user?.lotNumber} • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-24 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Weather + Resort Alerts + Park Map & Directions */}
          <div className="space-y-4">
            <WeatherWidget />
            <NotificationsWidget />
            
            {/* Park Map & Directions */}
            <div className="flex gap-3">
              <Link href="/map" className="block flex-1">
                <Card className="shadow-lg border-none overflow-hidden cursor-pointer hover:shadow-xl transition-shadow h-full">
                  <div className="relative w-full h-[140px]">
                    <img 
                      src={parkMapImage} 
                      alt="Park Map" 
                      className="w-full h-full object-cover"
                      data-testid="img-park-map-preview"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <Map className="w-4 h-4" />
                        <span className="font-semibold text-sm">Park Map</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </Card>
              </Link>

              <Card 
                className="shadow-lg border-none overflow-hidden cursor-pointer hover:shadow-xl transition-shadow flex-shrink-0"
                onClick={() => window.open('https://www.google.com/maps/dir/?api=1&destination=1000+N+Central+Ave,+Umatilla,+FL+32784&travelmode=driving', '_blank')}
                data-testid="button-directions-home"
              >
                <div className="h-[140px] w-[100px] bg-gradient-to-b from-[#2a4a6e] to-[#1E3A5F] flex flex-col items-center justify-center gap-2 p-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-white text-center">
                    <p className="font-semibold text-xs">Get</p>
                    <p className="font-semibold text-xs">Directions</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Column 2: Happening Soon, Alerts & Logo */}
          <div className="space-y-4">
            <Card className="shadow-lg border-none">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="font-display text-base">Happening Soon</CardTitle>
                <Link href="/activities">
                   <Button variant="ghost" size="sm" className="text-primary text-xs">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {upcomingActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">No upcoming activities scheduled.</p>
                ) : (
                  upcomingActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 items-center p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="bg-primary/10 text-primary rounded-md px-2 py-1 text-center min-w-[45px]">
                        <span className="block text-[10px] font-bold uppercase">{format(new Date(activity.date), 'MMM')}</span>
                        <span className="block text-base font-bold font-display">{format(new Date(activity.date), 'd')}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground text-sm truncate">{activity.title}</h4>
                        <p className="text-xs text-muted-foreground">{format(new Date(activity.date), 'h:mm a')}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            
            {/* Resort Website Link */}
            <a 
              href="https://www.oldemillstreamrvresort.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
              data-testid="link-resort-website"
            >
              <Card className="shadow-lg border-none overflow-hidden cursor-pointer hover:shadow-xl transition-all bg-white p-4 flex items-center justify-center">
                <img 
                  src={logoImg} 
                  alt="Visit Olde Mill Stream RV Resort Website" 
                  className="h-20 w-auto"
                  data-testid="img-logo-link"
                />
              </Card>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
