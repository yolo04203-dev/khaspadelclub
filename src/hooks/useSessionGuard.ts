import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";

interface UseSessionGuardOptions {
  onExpired?: () => void;
  redirectOnExpired?: boolean;
}

/**
 * Hook to monitor session expiry and handle gracefully
 * Shows user-friendly notifications when session expires
 */
export function useSessionGuard(options: UseSessionGuardOptions = {}) {
  const { session, authError, refreshSession, signOut } = useAuth();
  const hasShownExpiryToast = useRef(false);

  const handleExpiredSession = useCallback(async () => {
    if (hasShownExpiryToast.current) return;
    hasShownExpiryToast.current = true;

    logger.warn("Session expired, prompting user");

    toast({
      title: "Session expired",
      description: "Please sign in again to continue.",
      variant: "destructive",
      duration: 10000,
    });

    if (options.onExpired) {
      options.onExpired();
    }

    if (options.redirectOnExpired !== false) {
      // Give time for toast to show
      setTimeout(() => {
        try {
          signOut();
          window.location.href = "/auth";
        } catch (error) {
          logger.error("Failed to redirect after session expiry", error);
          window.location.href = "/auth";
        }
      }, 1500);
    }
  }, [options, signOut]);

  // Monitor for auth errors indicating session expiry
  useEffect(() => {
    if (authError?.includes("expired") || authError?.includes("refresh_token")) {
      handleExpiredSession();
    }
  }, [authError, handleExpiredSession]);

  // Check session validity periodically
  useEffect(() => {
    if (!session?.expires_at) return;

    const checkExpiry = () => {
      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // If expired or expiring in less than 1 minute
      if (timeUntilExpiry <= 60000) {
        logger.info("Session expiring soon, attempting refresh");
        refreshSession();
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);
    checkExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [session?.expires_at, refreshSession]);

  // Reset toast flag when session changes
  useEffect(() => {
    if (session) {
      hasShownExpiryToast.current = false;
    }
  }, [session]);

  return { session, isExpired: !session && hasShownExpiryToast.current };
}
