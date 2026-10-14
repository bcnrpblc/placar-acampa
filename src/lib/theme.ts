import type { Json } from "@/integrations/supabase/types";

/** Per-event scoreboard colors, stored in events.theme (jsonb). */
export type EventTheme = {
  background: string;
  text: string;
  accent: string;
};

export const THEME_PRESETS: { name: string; theme: EventTheme }[] = [
  { name: "Carvão", theme: { background: "#0B0D10", text: "#F4F6F8", accent: "#22D3EE" } },
  { name: "Noite", theme: { background: "#0A1020", text: "#F1F5FF", accent: "#FBBF24" } },
  { name: "Claro", theme: { background: "#F5F5F0", text: "#111418", accent: "#0E7490" } },
];

export const DEFAULT_THEME = THEME_PRESETS[0].theme;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseTheme(json: Json | null | undefined): EventTheme {
  const t = (json ?? {}) as Partial<Record<keyof EventTheme, unknown>>;
  const pick = (k: keyof EventTheme) =>
    typeof t[k] === "string" && HEX.test(t[k] as string) ? (t[k] as string) : DEFAULT_THEME[k];
  return { background: pick("background"), text: pick("text"), accent: pick("accent") };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colors (1 to 21). */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on the given color. */
export function readableOn(color: string) {
  if (!HEX.test(color)) return "#FFFFFF";
  return contrast(color, "#0B0D10") >= contrast(color, "#FFFFFF") ? "#0B0D10" : "#FFFFFF";
}
