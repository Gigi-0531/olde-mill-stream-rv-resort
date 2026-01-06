import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, Check } from "lucide-react";

const PERMISSIONS_KEY = "oms_permissions_requested";

export function PermissionsPrompt() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "notifications" | "location" | "done">("intro");
  const [notificationStatus, setNotificationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");

  useEffect(() => {
    const hasRequested = localStorage.getItem(PERMISSIONS_KEY);
    if (!hasRequested) {
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission === "granted" ? "granted" : "denied");
    } else {
      setNotificationStatus("denied");
    }
    setStep("location");
  };

  const handleLocationPermission = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationStatus("granted");
          setStep("done");
        },
        () => {
          setLocationStatus("denied");
          setStep("done");
        }
      );
    } else {
      setLocationStatus("denied");
      setStep("done");
    }
  };

  const handleSkipLocation = () => {
    setLocationStatus("denied");
    setStep("done");
  };

  const handleComplete = () => {
    localStorage.setItem(PERMISSIONS_KEY, "true");
    setOpen(false);
  };

  const handleSkipAll = () => {
    localStorage.setItem(PERMISSIONS_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-permissions">
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-display">Enable App Features</DialogTitle>
              <DialogDescription className="text-base">
                To get the best experience at Olde Mill Stream, we'd like to enable a few features for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Push Notifications</h4>
                  <p className="text-sm text-muted-foreground">Get alerts about resort activities, weather updates, and important announcements.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Location Services</h4>
                  <p className="text-sm text-muted-foreground">Help us provide accurate weather for your exact location.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={handleSkipAll} data-testid="button-skip-permissions">
                Maybe Later
              </Button>
              <Button onClick={() => setStep("notifications")} data-testid="button-enable-permissions">
                Enable Features
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "notifications" && (
          <>
            <DialogHeader>
              <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-xl font-display text-center">Enable Notifications</DialogTitle>
              <DialogDescription className="text-center text-base">
                Stay updated with resort alerts, activity reminders, and weather warnings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleNotificationPermission} className="w-full" data-testid="button-allow-notifications">
                Allow Notifications
              </Button>
              <Button variant="ghost" onClick={() => setStep("location")} className="w-full">
                Skip
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "location" && (
          <>
            <DialogHeader>
              <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-xl font-display text-center">Enable Location</DialogTitle>
              <DialogDescription className="text-center text-base">
                Get precise weather updates based on your current location within the resort.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleLocationPermission} className="w-full" data-testid="button-allow-location">
                Allow Location Access
              </Button>
              <Button variant="ghost" onClick={handleSkipLocation} className="w-full">
                Skip
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-xl font-display text-center">You're All Set!</DialogTitle>
              <DialogDescription className="text-center text-base">
                {notificationStatus === "granted" && locationStatus === "granted" 
                  ? "You'll receive notifications and location-based weather updates."
                  : notificationStatus === "granted"
                  ? "You'll receive notifications about resort updates."
                  : locationStatus === "granted"
                  ? "You'll get weather updates for your location."
                  : "You can enable these features later in your device settings."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleComplete} className="w-full" data-testid="button-done-permissions">
                Get Started
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
