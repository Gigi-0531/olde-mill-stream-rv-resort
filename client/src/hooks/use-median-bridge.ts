import { useEffect } from "react";
import Median, { isMedianApp } from "@/lib/median";
import { apiRequest } from "@/lib/queryClient";

async function registerToken(token: string) {
  try {
    await apiRequest("POST", "/api/push/register-apns", { token });
    console.log("[Median] push token registered");
  } catch (err) {
    console.warn("[Median] failed to register push token:", err);
  }
}

/**
 * Initializes the Median JS Bridge push flow.
 * - Registers for OneSignal push via the bridge
 * - Captures the OneSignal player/push token and saves it to our server
 * - No-ops silently when running in a plain browser
 */
export function useMedianBridge() {
  useEffect(() => {
    if (!isMedianApp) return;

    // Register for OneSignal push and capture the token
    Median.onesignal
      .register({})
      .then((info: any) => {
        const token = info?.oneSignalUserId || info?.userId || info?.token;
        if (token) registerToken(token);
      })
      .catch(() => {
        // Older Median versions — fall back to info()
        Median.onesignal
          .info({})
          .then((info: any) => {
            const token = info?.oneSignalUserId || info?.userId || info?.token;
            if (token) registerToken(token);
          })
          .catch(() => {});
      });

    // Listen for push notifications opened while app is in background
    Median.onesignal.pushOpened.addListener((data: any) => {
      console.log("[Median] push opened:", data);
      // Navigate to the right page if url is provided
      if (data?.additionalData?.url) {
        window.location.href = data.additionalData.url;
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
