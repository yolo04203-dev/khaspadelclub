import { useCallback } from "react";

type HapticStyle = "light" | "medium" | "heavy";

export function useHaptics() {
  const impact = useCallback(async (style: HapticStyle = "light") => {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    } catch {
      // Silent fallback on web
    }
  }, []);

  const notification = useCallback(async (type: "success" | "warning" | "error" = "success") => {
    try {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
      await Haptics.notification({ type: map[type] });
    } catch {
      // Silent fallback
    }
  }, []);

  const selectionChanged = useCallback(async () => {
    try {
      const { Haptics } = await import("@capacitor/haptics");
      await Haptics.selectionChanged();
    } catch {
      // Silent fallback
    }
  }, []);

  return { impact, notification, selectionChanged };
}
