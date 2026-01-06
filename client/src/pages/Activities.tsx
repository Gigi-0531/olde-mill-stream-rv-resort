import { useActivities } from "@/hooks/use-resources";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";

export default function Activities() {
  const { data: activities, isLoading } = useActivities();

  // Sort by date
  const sortedActivities = activities
    ? [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pt-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Activities Calendar</h1>
          <p className="text-muted-foreground">Join the fun at Olde Mill Stream</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedActivities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                No scheduled activities at this time.
              </div>
            ) : (
              sortedActivities.map((activity) => (
                <Card key={activity.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-primary text-primary-foreground p-6 flex flex-col items-center justify-center min-w-[120px] text-center">
                      <span className="text-sm font-bold uppercase tracking-wider opacity-80">
                        {format(new Date(activity.date), 'MMM')}
                      </span>
                      <span className="text-4xl font-display font-bold">
                        {format(new Date(activity.date), 'd')}
                      </span>
                      <span className="text-sm opacity-80">
                        {format(new Date(activity.date), 'EEEE')}
                      </span>
                    </div>
                    <CardContent className="p-6 flex-1">
                      <h3 className="text-xl font-bold mb-2">{activity.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(activity.date), 'h:mm a')}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {activity.location}
                        </div>
                      </div>
                      <p className="text-foreground/80 leading-relaxed">
                        {activity.description}
                      </p>
                    </CardContent>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
