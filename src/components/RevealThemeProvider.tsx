import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Json } from "@/integrations/supabase/types";
import { parseTheme, confettiColors, type EventTheme } from "@/lib/theme";
import { fillText, getRevealTexts, type RevealKind, type RevealTexts } from "@/lib/revealTexts";
import { ThemeScope } from "@/components/ThemeScope";

type Ctx = {
  theme: EventTheme;
  texts: RevealTexts;
  confetti: string[];
  eventTitle: string;
  /** Resolves {team}/{game}/{event} placeholders. */
  fill: (text: string, vars?: { team?: string; game?: string }) => string;
};

const RevealCtx = createContext<Ctx | null>(null);

/** Themes a reveal page and exposes its editable texts to nested components. */
export const RevealThemeProvider = ({
  event,
  kind,
  children,
}: {
  event: { title: string; subtitle: string | null; theme: Json | null; reveal_texts: Json | null } | null;
  kind: RevealKind;
  children: ReactNode;
}) => {
  const value = useMemo<Ctx>(() => {
    const theme = parseTheme(event?.theme);
    const eventTitle = event?.title ?? "";
    const texts = getRevealTexts(event?.reveal_texts, kind);
    return {
      theme,
      texts: { ...texts, subtitle: texts.subtitle || event?.subtitle?.trim() || eventTitle },
      confetti: confettiColors(theme),
      eventTitle,
      fill: (text, vars) => fillText(text, { ...vars, event: eventTitle }),
    };
  }, [event, kind]);

  return (
    <RevealCtx.Provider value={value}>
      <ThemeScope theme={event?.theme} className="min-h-screen">
        {children}
      </ThemeScope>
    </RevealCtx.Provider>
  );
};

export function useRevealTheme() {
  const ctx = useContext(RevealCtx);
  if (!ctx) throw new Error("useRevealTheme must be used inside RevealThemeProvider");
  return ctx;
}
