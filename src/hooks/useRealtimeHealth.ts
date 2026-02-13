import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeHealthState {
  status: "connecting" | "connected" | "disconnected" | "error";
  reconnectCount: number;
  lastConnectedAt: Date | null;
}

/**
 * Monitors Supabase real-time channel health with automatic cleanup.
 * Tracks connection status, reconnection events, and ensures proper teardown.
 */
export function useRealtimeHealth(
  channelName: string,
  config: {
    table: string;
    schema?: string;
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    onPayload?: (payload: unknown) => void;
  }
) {
  const [health, setHealth] = useState<RealtimeHealthState>({
    status: "connecting",
    reconnectCount: 0,
    lastConnectedAt: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: config.event || "*",
          schema: config.schema || "public",
          table: config.table,
        },
        (payload) => config.onPayload?.(payload)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setHealth((prev) => ({
            status: "connected",
            reconnectCount: prev.status === "disconnected" ? prev.reconnectCount + 1 : prev.reconnectCount,
            lastConnectedAt: new Date(),
          }));
        } else if (status === "CLOSED") {
          setHealth((prev) => ({ ...prev, status: "disconnected" }));
        } else if (status === "CHANNEL_ERROR") {
          setHealth((prev) => ({ ...prev, status: "error" }));
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, config.table, config.schema, config.event]);

  return health;
}
