import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../integrations/supabase/client";

type UserRole = "admin" | "player";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_REFRESH_INTERVAL = 55 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) return null;
      if (data?.some((row) => row.role === "admin")) return "admin";
      return (data?.[0]?.role as UserRole) || "player";
    } catch (error) {
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) return;
      if (data.session && isMountedRef.current) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (error) {
      return;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const safeSetRoleForSession = async (currentSession: Session | null) => {
      if (!currentSession?.user) {
        if (isMountedRef.current) setRole(null);
        return;
      }
      const userRole = await fetchUserRole(currentSession.user.id);
      if (isMountedRef.current) setRole(userRole);
    };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMountedRef.current) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthError(null);
      await safeSetRoleForSession(nextSession);
    });

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession }
        } = await supabase.auth.getSession();
        if (!isMountedRef.current) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        await safeSetRoleForSession(initialSession);
        if (initialSession) {
          refreshIntervalRef.current = setInterval(() => {
            void refreshSession();
          }, SESSION_REFRESH_INTERVAL);
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
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
          emailRedirectTo: "khaspadelclub://auth-callback",
          data: {
            display_name: displayName
          }
        }
      });
      if (error) {
        setAuthError(error.message);
        return error.message;
      }
      return null;
    } catch (error) {
      const message = "Unable to create account.";
      setAuthError(message);
      return message;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        return error.message;
      }
      return null;
    } catch (error) {
      const message = "Unable to sign in.";
      setAuthError(message);
      return message;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
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
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
