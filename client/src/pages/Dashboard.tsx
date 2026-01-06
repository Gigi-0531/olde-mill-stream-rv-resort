import { useAuth } from "@/hooks/use-auth";
import { WeatherWidget } from "@/components/WeatherWidget";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { PermissionsPrompt } from "@/components/PermissionsPrompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Map, Calendar, ArrowRight, Navigation } from "lucide-react";
import resortImage from "@assets/facebook_1767649108158_7414057724947186807_1767655553163.jpg";
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
      <div className="bg-primary pb-32 pt-10 px-4 md:px-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Column 1: Weather & Alerts */}
          <div className="space-y-6">
            <WeatherWidget />
            <NotificationsWidget />
          </div>

          {/* Column 2: Park Map & Directions */}
          <div className="space-y-6">
            <Link href="/map" className="block">
              <Card className="p-4 shadow-lg border-none bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Map className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">View Park Map</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>

            <Card className="shadow-lg border-none overflow-hidden">
              <div className="relative w-full h-[160px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3494.8976824680407!2d-81.6658!3d28.9264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e7c7d8a2d0e8e7%3A0x1234567890abcdef!2s1000%20N%20Central%20Ave%2C%20Umatilla%2C%20FL%2032784!5e0!3m2!1sen!2sus!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Olde Mill Stream RV Resort Location"
                  className="absolute inset-0"
                />
              </div>
              <div className="p-3 bg-gradient-to-r from-[#2a4a6e] to-[#1E3A5F] flex items-center justify-between gap-3">
                <div className="text-white text-sm">
                  <p className="font-semibold">Olde Mill Stream RV Resort</p>
                  <p className="text-white/70 text-xs">Umatilla, FL</p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => window.open('https://www.google.com/maps/dir/?api=1&destination=1000+N+Central+Ave,+Umatilla,+FL+32784&travelmode=driving', '_blank')}
                  className="bg-white text-[#1E3A5F] hover:bg-white/90 gap-1.5 font-semibold shrink-0"
                  data-testid="button-directions-home"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Directions
                </Button>
              </div>
            </Card>
          </div>

          {/* Column 3: Upcoming Activities */}
          <div className="space-y-6">
            <Card className="shadow-lg border-none h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">Happening Soon</CardTitle>
                <Link href="/activities">
                   <Button variant="ghost" size="sm" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No upcoming activities scheduled.</p>
                ) : (
                  upcomingActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 items-start p-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                      <div className="bg-primary/10 text-primary rounded-md p-2 text-center min-w-[60px]">
                        <span className="block text-xs font-bold uppercase">{format(new Date(activity.date), 'MMM')}</span>
                        <span className="block text-xl font-bold font-display">{format(new Date(activity.date), 'd')}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{format(new Date(activity.date), 'h:mm a')} • {activity.location}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
