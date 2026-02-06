import { useCallback } from "react";
import { useNavigate, NavigateOptions } from "react-router-dom";
import { logger } from "@/lib/logger";

/**
 * Safe navigation hook for iOS/Safari compatibility
 * Falls back to window.location if React Router navigation fails
 */
export function useSafeNavigation() {
  const navigate = useNavigate();

  const safeNavigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      try {
        navigate(to, options);
      } catch (error) {
        logger.navigationError(to, error);
        // Fallback for WebKit/Safari issues
        window.location.href = to;
      }
    },
    [navigate]
  );

  const safeGoBack = useCallback(() => {
    try {
      navigate(-1);
    } catch (error) {
      logger.navigationError("back", error);
      window.history.back();
    }
  }, [navigate]);

  const safeReplace = useCallback(
    (to: string) => {
      try {
        navigate(to, { replace: true });
      } catch (error) {
        logger.navigationError(to, error);
        window.location.replace(to);
      }
    },
    [navigate]
  );

  return {
    navigate: safeNavigate,
    goBack: safeGoBack,
    replace: safeReplace,
  };
}
