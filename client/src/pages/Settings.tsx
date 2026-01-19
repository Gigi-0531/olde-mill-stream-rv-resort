import { useState, useEffect, useRef } from "react";
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
import { Bell, Cloud, AlertTriangle, Loader2, Settings as SettingsIcon, Camera, User } from "lucide-react";

interface PushSubscriptionData {
  id: number;
  userId: number;
  weatherEnabled: boolean;
  alertsEnabled: boolean;
}

interface UploadUrlResponse {
  uploadUrl: string;
  objectPath: string;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: vapidKey } = useQuery<{ publicKey: string }>({
    queryKey: ["/api/push/vapid-key"],
  });

  const { data: subscription, isLoading: subLoading } = useQuery<PushSubscriptionData | null>({
    queryKey: ["/api/push/subscription"],
    enabled: !!user,
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
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

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const moderationRes = await apiRequest("POST", "/api/moderate/image", { image: base64 });
      const moderation = await moderationRes.json();
      
      if (!moderation.isAllowed) {
        toast({ 
          title: "Image not allowed", 
          description: moderation.reason || "This image violates community guidelines",
          variant: "destructive" 
        });
        setIsUploading(false);
        return;
      }

      const urlRes = await apiRequest("POST", "/api/uploads/request-url", {
        fileName: file.name,
        contentType: file.type,
        directory: ".private/profile-pictures",
      });
      const { uploadUrl, objectPath }: UploadUrlResponse = await urlRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Update profile with server-side moderation
      const updateRes = await apiRequest("PATCH", "/api/profile/picture", { 
        objectPath, 
        imageData: base64,
        mimeType: file.type 
      });
      
      if (!updateRes.ok) {
        const error = await updateRes.json();
        throw new Error(error.reason || error.message || "Failed to update profile");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Profile picture updated!" });
    } catch (error) {
      console.error("Failed to upload:", error);
      toast({ title: "Failed to upload picture", variant: "destructive" });
    }
    setIsUploading(false);
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
              Profile Picture
            </CardTitle>
            <CardDescription>
              Update your profile picture that others see in messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-border">
                  {currentUser?.profilePicture && (
                    <AvatarImage src={currentUser.profilePicture} className="object-cover" />
                  )}
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleProfilePictureClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                  data-testid="button-change-picture"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div>
                <p className="font-medium">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">Lot {user?.lotNumber}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleProfilePictureClick}
                  disabled={isUploading}
                >
                  Change Picture
                </Button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <p className="text-xs text-muted-foreground mt-4">
              Images are automatically checked to ensure they meet community guidelines.
            </p>
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

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
