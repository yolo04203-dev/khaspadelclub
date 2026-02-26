import { getSentry } from "@/lib/sentryLazy";
import { logger } from "@/lib/logger";

interface SafePluginSuccess<T> {
  success: true;
  data: T;
}

interface SafePluginFailure {
  success: false;
  error: string;
}

export type SafePluginResult<T> = SafePluginSuccess<T> | SafePluginFailure;

const FRIENDLY_MESSAGES: Record<string, string> = {
  "User cancelled": "Action was cancelled.",
  "User denied access": "Permission was denied. Please allow access in your device settings.",
  "No image picked": "No image was selected.",
  "Camera is not available": "Camera is not available on this device.",
};

function getFriendlyMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  for (const [key, friendly] of Object.entries(FRIENDLY_MESSAGES)) {
    if (msg.includes(key)) return friendly;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Safely call a Capacitor plugin method with error normalization,
 * Sentry reporting, and DB logging.
 *
 * @example
 * const result = await safePluginCall("Camera", () => Camera.getPhoto(opts));
 * if (!result.success) toast.error(result.error);
 */
export async function safePluginCall<T>(
  pluginName: string,
  fn: () => Promise<T>
): Promise<SafePluginResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // User-initiated cancellations don't need Sentry noise
    const isUserAction = msg.includes("User cancelled") || msg.includes("User denied");

    if (!isUserAction) {
      getSentry().then(S => {
        if (!S) return;
        S.addBreadcrumb({ category: "plugin", message: `${pluginName} failed: ${msg}`, level: "error" });
        S.captureException(error, { tags: { plugin: pluginName }, extra: { pluginName } });
      }).catch(() => {});
      logger.error(`Plugin error: ${pluginName}`, error, { pluginName });
    }

    return { success: false, error: getFriendlyMessage(error) };
  }
}
