import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useActivities, useCreateActivity, useDeleteActivity, useNotifications } from "@/hooks/use-resources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivitySchema } from "@shared/schema";
import { Plus, Trash2, Calendar, Bell, Users, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import Directory from "./Directory";
import { NotificationsWidget } from "@/components/NotificationsWidget";

export default function Admin() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage park activities and alerts</p>
          </div>
        </div>

        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm border">
            <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="w-4 h-4 mr-2" /> Activities
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="w-4 h-4 mr-2" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="directory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" /> Directory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <ActivitiesManager />
          </TabsContent>

          <TabsContent value="alerts">
            <div className="max-w-2xl">
              <h3 className="text-xl font-bold mb-4">Active Alerts</h3>
              <NotificationsWidget />
            </div>
          </TabsContent>

          <TabsContent value="directory">
            <Directory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ActivitiesManager() {
  const { data: activities, isLoading } = useActivities();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertActivitySchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: new Date(), // This needs careful handling with date inputs
    },
  });

  const onSubmit = (data: any) => {
    // Basic date handling for demo - assumes browser native datetime-local input
    createActivity.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Scheduled Activities</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Bingo Night" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Clubhouse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Details about the event..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createActivity.isPending}>
                  {createActivity.isPending ? "Creating..." : "Create Activity"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : activities?.length === 0 ? (
          <p className="text-muted-foreground">No activities found.</p>
        ) : (
          activities?.map((activity) => (
            <Card key={activity.id} className="flex flex-row items-center justify-between p-4">
              <div className="flex gap-4 items-center">
                <div className="bg-primary/10 w-16 h-16 rounded-lg flex flex-col items-center justify-center text-primary font-bold">
                  <span className="text-xs uppercase">{format(new Date(activity.date), 'MMM')}</span>
                  <span className="text-xl">{format(new Date(activity.date), 'd')}</span>
                </div>
                <div>
                  <h4 className="font-bold">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {format(new Date(activity.date), 'h:mm a')}
                    <MapPin className="w-3 h-3 ml-2" /> {activity.location}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Delete this activity?')) deleteActivity.mutate(activity.id);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
