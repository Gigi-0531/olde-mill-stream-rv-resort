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

  useEffect(() => {
    const hasRequested = localStorage.getItem(PERMISSIONS_KEY);
    if (!hasRequested) {
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNotificationsContinue = () => {
    // Advance the UI immediately so the app is responsive
    setStep("location");
    // Request permission in the background — system dialog will appear if supported
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  };

  const handleLocationContinue = () => {
    // Advance the UI immediately so the app is responsive
    setStep("done");
    // Request location in the background — system dialog will appear if supported
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { timeout: 10000, maximumAge: 60000 }
        );
      }
    } catch {}
  };

  const handleComplete = () => {
    localStorage.setItem(PERMISSIONS_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} >
      <DialogContent
        className="sm:max-w-md"
        data-testid="dialog-permissions"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-display">App Features</DialogTitle>
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
            <DialogFooter>
              <Button
                onClick={() => setStep("notifications")}
                className="w-full"
                data-testid="button-enable-permissions"
              >
                Continue
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
              <DialogTitle className="text-xl font-display text-center">Notifications</DialogTitle>
              <DialogDescription className="text-center text-base">
                Stay updated with resort alerts, activity reminders, and weather warnings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleNotificationsContinue}
                className="w-full"
                data-testid="button-allow-notifications"
              >
                Continue
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
              <DialogTitle className="text-xl font-display text-center">Location</DialogTitle>
              <DialogDescription className="text-center text-base">
                Get precise weather updates based on your current location within the resort.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleLocationContinue}
                className="w-full"
                data-testid="button-allow-location"
              >
                Continue
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
                Welcome to Olde Mill Stream RV Resort. You can manage notification preferences in Settings.
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
