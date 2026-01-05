import { useAuth } from "@/hooks/use-auth";
import { WeatherWidget } from "@/components/WeatherWidget";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Map, Calendar, Users, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-background pb-20">
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

          {/* Column 2: Quick Actions & Map */}
          <div className="space-y-6">
            <Card className="h-full shadow-lg border-none flex flex-col">
              <CardHeader>
                <CardTitle className="font-display">Park Map</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[200px] flex items-center justify-center bg-accent/20 rounded-b-xl relative overflow-hidden group p-0">
                <img src={resortImage} alt="Resort lake view" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-primary/20" />
                
                <Link href="/map" className="relative z-10">
                  <Button variant="rustic" size="lg" className="gap-2">
                    <Map className="w-5 h-5" /> View Full Map
                  </Button>
                </Link>
              </CardContent>
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
