import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "player";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMountedRef = useRef(true);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch all roles for the user (they may have multiple)
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      // If user has admin role, prioritize it
      if (data?.some((r) => r.role === "admin")) {
        return "admin" as UserRole;
      }

      // Otherwise return the first role or default to player
      return (data?.[0]?.role as UserRole) || "player";
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const safeSetRoleForSession = async (session: Session | null) => {
      if (!isMountedRef.current) return;

      if (!session?.user) {
        setRole(null);
        return;
      }

      const userRole = await fetchUserRole(session.user.id);
      if (!isMountedRef.current) return;
      setRole(userRole);
    };

    // Listener for ongoing auth changes (does NOT control isLoading)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMountedRef.current) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Fetch role in the background; don't block navigation/render.
      void safeSetRoleForSession(nextSession);
    });

    // Initial session restore (controls isLoading)
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Ensure role is resolved before marking app ready
        await safeSetRoleForSession(initialSession);
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
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

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
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
        signUp,
        signIn,
        signOut,
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
