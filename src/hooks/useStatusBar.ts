import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { logger } from "@/lib/logger";

/**
 * Dynamically updates the Capacitor StatusBar style to match the current theme.
 * On web, this is a no-op.
 */
export function useStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const isDark =
          document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark";

        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({
            color: isDark ? "#0d1a2d" : "#ffffff",
          });
        }
      } catch (error) {
        logger.debug("StatusBar plugin not available", { error });
      }
    };

    // Run on mount
    void updateStatusBar();

    // Observe theme changes via class mutations on <html>
    const observer = new MutationObserver(() => {
      void updateStatusBar();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);
}
