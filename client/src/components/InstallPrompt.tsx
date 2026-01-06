import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOSDevice && !isInStandaloneMode) {
      setIsIOS(true);
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Download className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install App</h3>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-1">
              Tap the share button and select "Add to Home Screen" to install.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Install for quick access from your home screen.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <Button size="sm" onClick={handleInstall} data-testid="button-install-app">
                Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss} data-testid="button-dismiss-install">
              {isIOS ? "Got it" : "Not now"}
            </Button>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="shrink-0" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
