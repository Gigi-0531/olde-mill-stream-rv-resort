import { useEffect } from "react";
import Median, { isMedianApp } from "@/lib/median";

/**
 * Initializes the Median JS Bridge.
 * - Registers for OneSignal push via the bridge (Median handles subscriber creation in OneSignal)
 * - Listens for push notifications opened while app is backgrounded
 * - No-ops silently when running in a plain browser
 */
export function useMedianBridge() {
  useEffect(() => {
    if (!isMedianApp) return;

    // Trigger OneSignal registration through the Median bridge.
    // Median's native SDK handles subscriber creation in OneSignal automatically —
    // no need to store or forward any token from our side.
    Median.onesignal
      .register({})
      .catch(() => {
        // Older Median versions — fall back to info() just to wake the SDK
        Median.onesignal.info({}).catch(() => {});
      });

    // Navigate to the relevant page when a push notification is tapped
    Median.onesignal.pushOpened.addListener((data: any) => {
      const url = data?.additionalData?.url || data?.launchURL;
      if (url) {
        try {
          const path = new URL(url).pathname;
          window.location.href = path;
        } catch {
          window.location.href = url;
        }
      }
    });
  }, []);
}

/**
 * Trigger a haptic feedback pulse. No-ops in browser.
 * @param style 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
 */
export function haptic(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "medium") {
  if (!isMedianApp) return;
  try {
    Median.haptics.trigger({ style });
  } catch {}
}
