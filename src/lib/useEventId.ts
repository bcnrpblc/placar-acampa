import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Resolves the `:slug` route param to the event (null while loading / not found). */
export function useEventId() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<{
    id: string;
    title: string;
    subtitle: string | null;
    theme: Json | null;
    reveal_texts: Json | null;
    status: "draft" | "live" | "ended";
    final_snapshot: Json | null;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("events")
      .select("id, title, subtitle, theme, reveal_texts, status, final_snapshot")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => (data ? setEvent(data) : setNotFound(true)));
  }, [slug]);

  return { eventId: event?.id ?? null, event, slug, notFound };
}
