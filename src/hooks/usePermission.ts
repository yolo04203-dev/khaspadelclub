import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePermission(permission: string): { hasPermission: boolean; isLoading: boolean } {
  const { user, role } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    // Super admins and admins have all permissions
    if (role === "super_admin" || role === "admin") {
      setHasPermission(true);
      setIsLoading(false);
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from("user_permissions")
          .select("id")
          .eq("user_id", user.id)
          .eq("permission", permission)
          .maybeSingle();

        if (error) {
          setHasPermission(false);
        } else {
          setHasPermission(!!data);
        }
      } catch {
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [user, role, permission]);

  return { hasPermission, isLoading };
}
