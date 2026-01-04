import { useNotifications, useCreateNotification } from "@/hooks/use-resources";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, AlertCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertNotificationSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Textarea } from "./ui/textarea";

export function NotificationsWidget() {
  const { data: notifications, isLoading } = useNotifications();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isOpen, setIsOpen] = useState(false);
  const createNotification = useCreateNotification();

  const form = useForm({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      content: "",
      active: true,
    },
  });

  const onSubmit = (data: any) => {
    createNotification.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
    });
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

  const activeNotifications = notifications?.filter(n => n.active) || [];

  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-display">Resort Alerts</CardTitle>
          </div>
          {isAdmin && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Alert</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Message</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="e.g. Water shutoff scheduled for Tuesday..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createNotification.isPending}>
                      {createNotification.isPending ? "Posting..." : "Post Alert"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {activeNotifications.length === 0 ? (
          <p className="text-muted-foreground text-sm italic py-2">No active alerts at the moment.</p>
        ) : (
          activeNotifications.map((notif) => (
            <Alert key={notif.id} variant="destructive" className="bg-red-50 border-red-200 text-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">Important Update</AlertTitle>
              <AlertDescription className="mt-1 text-sm">
                {notif.content}
              </AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
}
