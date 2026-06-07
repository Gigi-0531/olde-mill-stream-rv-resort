import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    median?: {
      push?: {
        requestPermission?: (opts?: { callback?: string }) => void;
      };
    };
    // Median calls this global function with push token data
    medianPushTokenRegister?: (data: { token?: string; granted?: boolean }) => void;
    // Older GoNative / Median callback
    gonative_firebase_devicetoken?: (data: { token?: string }) => void;
    // Sometimes set as a plain variable
    median_push_token?: string;
  }
}

async function registerApnsToken(token: string) {
  try {
    await apiRequest("POST", "/api/push/register-apns", { token });
    console.log("[Median] APNs token registered");
  } catch (err) {
    console.warn("[Median] Failed to register APNs token:", err);
  }
}

/**
 * Hook that detects Median's JS Bridge and registers the native push token
 * with our server whenever it becomes available.
 *
 * Safe to call outside Median — it no-ops in a plain browser.
 */
export function useMedianBridge() {
  useEffect(() => {
    // 1. If token is already available as a global variable, register it now
    if (window.median_push_token) {
      registerApnsToken(window.median_push_token);
    }

    // 2. Expose global callback that Median will invoke with the token
    window.medianPushTokenRegister = (data) => {
      if (data?.token) registerApnsToken(data.token);
    };

    // 3. Legacy GoNative / older Median callback
    window.gonative_firebase_devicetoken = (data) => {
      if (data?.token) registerApnsToken(data.token);
    };

    // 4. If the Median JS bridge object is present, request push permission
    //    This triggers the native iOS/Android push permission dialog if not yet shown
    if (window.median?.push?.requestPermission) {
      window.median.push.requestPermission({ callback: "medianPushTokenRegister" });
    }

    return () => {
      // Leave callbacks in place — they're harmless and may fire later
    };
  }, []);
}
