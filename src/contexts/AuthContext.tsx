import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { setErrorReportingUser, clearErrorReportingUser } from "@/lib/errorReporting";
import { analytics } from "@/lib/analytics/posthog";

/** Hide the native splash screen once auth is resolved */
async function hideSplashScreen() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
    logger.debug("Splash screen dismissed");
  } catch {
    // Plugin not installed — safe to ignore
  }
}

type UserRole = "super_admin" | "admin" | "player";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session refresh interval (4 minutes before token expires)
const SESSION_REFRESH_INTERVAL = 55 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        logger.error("Error fetching user role", error instanceof Error ? error : new Error(JSON.stringify(error)), { userId });
        return null;
      }

      // Prioritize: super_admin > admin > player
      if (data?.some((r) => r.role === "super_admin")) {
        return "super_admin";
      }
      if (data?.some((r) => r.role === "admin")) {
        return "admin";
      }

      // Otherwise return the first role or default to player
      return (data?.[0]?.role as UserRole) || "player";
    } catch (error) {
      logger.error("Error fetching user role", error instanceof Error ? error : new Error(JSON.stringify(error)), { userId });
      return null;
    }
  }, []);

  // Safe session refresh handler
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        logger.warn("Session refresh failed", { error: error.message });
        // Don't sign out immediately - token might still be valid
        return;
      }
      if (data.session && isMountedRef.current) {
        setSession(data.session);
        setUser(data.session.user);
        logger.debug("Session refreshed successfully");
      }
    } catch (error) {
      logger.error("Session refresh error", error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const safeSetRoleForSession = async (currentSession: Session | null) => {
      if (!isMountedRef.current) return;

      if (!currentSession?.user) {
        setRole(null);
        return;
      }

      const userRole = await fetchUserRole(currentSession.user.id);
      if (!isMountedRef.current) return;
      setRole(userRole);
    };

    // Listener for ongoing auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMountedRef.current) return;

      logger.debug("Auth state changed", { event });

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthError(null);

      // Handle specific auth events
      if (event === "SIGNED_OUT") {
        setRole(null);
        clearErrorReportingUser();
        analytics.reset();
        analytics.track("Logout");
        // Clear refresh interval on sign out
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      } else if (event === "TOKEN_REFRESHED") {
        logger.debug("Token refreshed by Supabase");
      }

      // Fetch role in the background
      void safeSetRoleForSession(nextSession);
    });

    // Initial session restore with retry logic
    const initializeAuth = async (retryCount = 0) => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          // Handle specific errors
          if (error.message.includes("refresh_token_not_found")) {
            logger.warn("Refresh token not found, user needs to re-authenticate");
            setAuthError("Session expired. Please sign in again.");
          } else {
            logger.error("Error getting session", error);
            setAuthError("Failed to restore session");
          }
          
          // Retry once for transient errors
          if (retryCount < 1 && !error.message.includes("refresh_token")) {
            logger.info("Retrying session restore...");
            setTimeout(() => initializeAuth(retryCount + 1), 1000);
            return;
          }
        }

        if (!isMountedRef.current) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          setErrorReportingUser({ id: initialSession.user.id });
          analytics.identify({
            id: initialSession.user.id,
            createdAt: initialSession.user.created_at,
          });
        }

        // Ensure role is resolved before marking app ready
        await safeSetRoleForSession(initialSession);

        // Set up periodic session refresh for long sessions
        if (initialSession) {
          refreshIntervalRef.current = setInterval(() => {
            void refreshSession();
          }, SESSION_REFRESH_INTERVAL);
        }
      } catch (error) {
        logger.error("Error initializing auth", error);
        if (isMountedRef.current) {
          setAuthError("Failed to initialize authentication");
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
        // Dismiss splash screen now that auth state is resolved
        void hideSplashScreen();
      }
    };

    void initializeAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchUserRole, refreshSession]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        logger.authError("signUp", error);
      } else {
        analytics.track("Signup Completed");
      }

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      logger.authError("signUp", error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.authError("signIn", error);
      } else {
        analytics.track("Login");
      }

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      logger.authError("signIn", error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setAuthError(null);
      
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      logger.info("User signed out");
    } catch (error) {
      logger.authError("signOut", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        authError,
        signUp,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
