import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
}

/**
 * Hook to monitor network status for graceful degradation
 * Handles slow networks and offline scenarios
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    const isSlowConnection = connection?.effectiveType === "slow-2g" || 
                             connection?.effectiveType === "2g" ||
                             connection?.downlink < 1;

    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection: isSlowConnection ?? false,
      connectionType: connection?.effectiveType ?? null,
    });

    if (!navigator.onLine) {
      logger.warn("Network offline detected");
    } else if (isSlowConnection) {
      logger.warn("Slow network connection detected", { type: connection?.effectiveType });
    }
  }, []);

  useEffect(() => {
    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}
