import { useActivities } from "@/hooks/use-resources";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Clock, Sparkles } from "lucide-react";

function toEST(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

export default function Activities() {
  const { data: activities, isLoading } = useActivities();

  const sortedActivities = activities
    ? [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const eventCount = sortedActivities.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/20 dark:via-background dark:to-background pt-16">
      <div className="bg-gradient-to-r from-[#1E3A5F] via-[#2a4a6e] to-sky-600 py-12 px-4 mb-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <CalendarIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white" data-testid="text-page-title">
              Activities Calendar
            </h1>
            <p className="text-sky-100 mt-2 text-lg">Join the fun at Olde Mill Stream</p>
          </div>
          {!isLoading && eventCount > 0 && (
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-white/20 text-white border-white/30 backdrop-blur-sm" data-testid="badge-event-count">
              <Sparkles className="w-3 h-3 mr-1" />
              {eventCount} upcoming event{eventCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pb-12">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedActivities.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-md" data-testid="text-empty-state">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Scheduled Activities</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  There are no upcoming activities at this time. Check back soon for new events and gatherings.
                </p>
              </div>
            ) : (
              sortedActivities.map((activity, index) => (
                <Card
                  key={activity.id}
                  className="overflow-visible hover-elevate animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
                  data-testid={`card-activity-${activity.id}`}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-gradient-to-br from-[#1E3A5F] to-sky-600 text-white p-6 flex flex-col items-center justify-center min-w-[120px] text-center rounded-md md:rounded-r-none">
                      <span className="text-sm font-bold uppercase tracking-wider opacity-80">
                        {format(toEST(activity.date), 'MMM')}
                      </span>
                      <span className="text-4xl font-display font-bold">
                        {format(toEST(activity.date), 'd')}
                      </span>
                      <span className="text-sm opacity-80">
                        {format(toEST(activity.date), 'EEEE')}
                      </span>
                    </div>
                    <CardContent className="p-6 flex-1">
                      <h3 className="text-xl font-bold mb-2" data-testid={`text-activity-title-${activity.id}`}>
                        {activity.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(toEST(activity.date), 'h:mm a')} EST
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
