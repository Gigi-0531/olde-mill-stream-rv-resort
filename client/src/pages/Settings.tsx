import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellRing, Cloud, AlertTriangle, Loader2, Settings as SettingsIcon, User } from "lucide-react";

interface PushSubscriptionData {
  id: number;
  userId: number;
  weatherEnabled: boolean;
  alertsEnabled: boolean;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: vapidKey } = useQuery<{ publicKey: string }>({
    queryKey: ["/api/push/vapid-key"],
  });

  const { data: subscription, isLoading: subLoading } = useQuery<PushSubscriptionData | null>({
    queryKey: ["/api/push/subscription"],
    enabled: !!user,
  });

  useEffect(() => {
    if (subscription) {
      setNotificationsEnabled(true);
    }
  }, [subscription]);

  const updatePreferences = useMutation({
    mutationFn: async (data: { weatherEnabled: boolean; alertsEnabled: boolean }) => {
      const res = await apiRequest("PATCH", "/api/push/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/subscription"] });
      toast({ title: "Preferences saved" });
    },
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/push/unsubscribe");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/subscription"] });
      setNotificationsEnabled(false);
      toast({ title: "Notifications disabled" });
    },
  });

  const testNotification = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/send-push-notification", {
        userEmail: user!.username,
        title: "Test Notification",
        message: "Push notifications are working!",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Test notification sent!", description: "Check your device for the notification." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send notification", description: err.message, variant: "destructive" });
    },
  });

  const handleEnableNotifications = async () => {
    if (!vapidKey?.publicKey) {
      toast({ title: "Push notifications not available", variant: "destructive" });
      return;
    }

    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ 
          title: "Permission denied", 
          description: "Please enable notifications in your browser settings",
          variant: "destructive" 
        });
        setIsSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey),
      });

      const subJson = sub.toJSON();
      const response = await apiRequest("POST", "/api/push/subscribe", {
        endpoint: sub.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
        weatherEnabled: true,
        alertsEnabled: true,
      });

      if (!response.ok) {
        throw new Error("Server rejected subscription");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/push/subscription"] });
      setNotificationsEnabled(true);
      toast({ title: "Notifications enabled!" });
    } catch (error) {
      console.error("Failed to subscribe:", error);
      setNotificationsEnabled(false);
      toast({ 
        title: "Failed to enable notifications", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
    setIsSubscribing(false);
  };

  const handleDisableNotifications = () => {
    unsubscribe.mutate();
  };

  const handleToggleWeather = (enabled: boolean) => {
    if (subscription) {
      updatePreferences.mutate({ 
        weatherEnabled: enabled, 
        alertsEnabled: subscription.alertsEnabled 
      });
    }
  };

  const handleToggleAlerts = (enabled: boolean) => {
    if (subscription) {
      updatePreferences.mutate({ 
        weatherEnabled: subscription.weatherEnabled, 
        alertsEnabled: enabled 
      });
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.lastName?.slice(0, 2).toUpperCase() || "ME";
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <div className="bg-[#4a7ab0] py-8 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-display text-white flex items-center gap-2">
            <SettingsIcon className="w-7 h-7" />
            Settings
          </h1>
          <p className="text-white/80 mt-1">Manage your profile and notification preferences</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 border-4 border-border">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">Lot {user?.lotNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Receive notifications on your lock screen for important updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {user?.username && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div>
                  <p className="text-sm font-medium">Send Test Notification</p>
                  <p className="text-xs text-muted-foreground">Sends a test push to {user.username}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testNotification.mutate()}
                  disabled={testNotification.isPending}
                  data-testid="button-test-notification"
                >
                  {testNotification.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><BellRing className="w-4 h-4 mr-1" /> Test</>
                  )}
                </Button>
              </div>
            )}
            {!("Notification" in window) || !("serviceWorker" in navigator) ? (
              <div className="text-muted-foreground text-center py-4">
                <p>Push notifications are not supported in your browser.</p>
                <p className="text-sm mt-2">Try using Chrome, Safari, or Firefox on a mobile device.</p>
              </div>
            ) : !notificationsEnabled ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Enable notifications to receive weather updates and resort alerts directly on your device.
                </p>
                <Button 
                  onClick={handleEnableNotifications} 
                  disabled={isSubscribing}
                  data-testid="button-enable-notifications"
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    <div>
                      <Label className="text-base">Weather Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Severe weather warnings for Umatilla area
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={subscription?.weatherEnabled ?? true}
                    onCheckedChange={handleToggleWeather}
                    disabled={updatePreferences.isPending}
                    data-testid="switch-weather-notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div>
                      <Label className="text-base">Resort Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Important park announcements and updates
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={subscription?.alertsEnabled ?? true}
                    onCheckedChange={handleToggleAlerts}
                    disabled={updatePreferences.isPending}
                    data-testid="switch-resort-notifications"
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleDisableNotifications}
                    disabled={unsubscribe.isPending}
                    data-testid="button-disable-notifications"
                  >
                    Disable All Notifications
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
