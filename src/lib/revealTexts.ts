import type { Json } from "@/integrations/supabase/types";

export type RevealKind = "day" | "game" | "final";

/** Editable reveal copy. Placeholders: {team}, {game}, {event}. */
export type RevealTexts = {
  title: string;
  subtitle: string;
  verse: string;
  verseRef: string;
  countdownTitle: string;
  countdownSubtitle: string;
  top3Title: string;
  winnerTitle: string;
  completeTitle: string;
  completeSubtitle: string;
};

export const REVEAL_TEXT_FIELDS: { key: keyof RevealTexts; label: string; hint?: string }[] = [
  { key: "title", label: "Título" },
  { key: "subtitle", label: "Subtítulo", hint: "Vazio usa o nome do evento" },
  { key: "verse", label: "Frase / versículo" },
  { key: "verseRef", label: "Referência" },
  { key: "countdownTitle", label: "Contagem: título", hint: "Só na apuração final" },
  { key: "countdownSubtitle", label: "Contagem: subtítulo", hint: "Só na apuração final" },
  { key: "top3Title", label: "Título do Top 3" },
  { key: "winnerTitle", label: "Título do vencedor" },
  { key: "completeTitle", label: "Título do encerramento" },
  { key: "completeSubtitle", label: "Texto do encerramento", hint: "Use {team}, {game}, {event}" },
];

export const REVEAL_KIND_LABEL: Record<RevealKind, string> = {
  day: "Apuração do dia",
  game: "Apuração por jogo",
  final: "Apuração final",
};

const COMMON = { subtitle: "", verse: "", verseRef: "", countdownTitle: "", countdownSubtitle: "" };

export const DEFAULT_REVEAL_TEXTS: Record<RevealKind, RevealTexts> = {
  day: {
    ...COMMON,
    title: "APURAÇÃO DO DIA",
    top3Title: "TOP 3 DO DIA! 🏆",
    winnerTitle: "🏆 A EQUIPE QUE MAIS PONTUOU HOJE FOI 🏆",
    completeTitle: "Apuração Completa! ✨",
    completeSubtitle: "Parabéns à equipe {team}!",
  },
  game: {
    ...COMMON,
    title: "APURAÇÃO POR JOGO",
    top3Title: "TOP 3 DO JOGO! 🏆",
    winnerTitle: "🏆 EQUIPE CAMPEÃ! 🏆",
    completeTitle: "Apuração Completa! ✨",
    completeSubtitle: "Jogo: {game} — parabéns à equipe {team}!",
  },
  final: {
    ...COMMON,
    title: "APURAÇÃO FINAL",
    countdownTitle: "CHEGOU A HORA...",
    countdownSubtitle: "INICIANDO A APURAÇÃO!",
    top3Title: "TOP 3!",
    winnerTitle: "É CAMPEÃ!!!",
    completeTitle: "{event} FINALIZADO!",
    completeSubtitle: "GRANDE VENCEDOR: {team}",
  },
};

/** Saved texts for a kind merged over the defaults. Empty strings are kept (they hide the line). */
export function getRevealTexts(saved: Json | null | undefined, kind: RevealKind): RevealTexts {
  const base = DEFAULT_REVEAL_TEXTS[kind];
  const forKind =
    saved && typeof saved === "object" && !Array.isArray(saved)
      ? (saved as Record<string, Json>)[kind]
      : null;
  if (!forKind || typeof forKind !== "object" || Array.isArray(forKind)) return base;
  const out = { ...base };
  for (const k of Object.keys(base) as (keyof RevealTexts)[]) {
    const v = (forKind as Record<string, Json>)[k];
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function fillText(text: string, vars: { team?: string; game?: string; event?: string }) {
  return text
    .split("{team}").join(vars.team ?? "")
    .split("{game}").join(vars.game ?? "")
    .split("{event}").join(vars.event ?? "");
}
