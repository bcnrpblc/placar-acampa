import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RevealKind = "day" | "game" | "final";
export type RevealCommand =
  | { type: "start"; kind: RevealKind; gameId?: string }
  | { type: "stop" };

const channelName = (eventId: string) => `reveal:${eventId}`;

/**
 * Reveal page (the TV). Waits for the admin's "start" command on the event channel.
 * A second start (run again) or a stop reloads the page back to its waiting state;
 * a pending start survives the reload via sessionStorage.
 */
export function useRevealScreen(
  eventId: string | null,
  kind: RevealKind,
  onStart: (cmd: { gameId?: string }) => void
) {
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const started = useRef(false);

  useEffect(() => {
    if (!eventId) return;
    const pendingKey = `reveal-pending:${eventId}:${kind}`;
    const run = (cmd: { gameId?: string }) => {
      started.current = true;
      onStartRef.current(cmd);
    };

    const ch = supabase.channel(channelName(eventId));
    ch.on("broadcast", { event: "cmd" }, ({ payload }) => {
      const cmd = payload as RevealCommand;
      if (cmd.type === "stop") {
        sessionStorage.removeItem(pendingKey);
        window.location.reload();
      } else if (cmd.type === "start" && cmd.kind === kind) {
        if (started.current) {
          sessionStorage.setItem(pendingKey, JSON.stringify(cmd));
          window.location.reload();
        } else {
          run(cmd);
        }
      }
    }).subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await ch.track({ role: "screen", kind });
      const pending = sessionStorage.getItem(pendingKey);
      if (pending) {
        sessionStorage.removeItem(pendingKey);
        run(JSON.parse(pending));
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, kind]);
}

/** Admin side: which reveal screens are open, and a way to send commands to them. */
export function useRevealController(eventId: string) {
  const [screens, setScreens] = useState<RevealKind[]>([]);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const ch = supabase.channel(channelName(eventId));
    chRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const kinds = Object.values(ch.presenceState())
        .flat()
        .map((m) => m as unknown as { role?: string; kind?: RevealKind })
        .filter((m) => m.role === "screen" && m.kind)
        .map((m) => m.kind as RevealKind);
      setScreens(kinds);
    }).subscribe();

    return () => {
      chRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [eventId]);

  const send = useCallback((cmd: RevealCommand) => {
    chRef.current?.send({ type: "broadcast", event: "cmd", payload: cmd });
  }, []);

  return { screens, send };
}
