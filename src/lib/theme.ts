import type { CSSProperties } from "react";
import type { Json } from "@/integrations/supabase/types";

export const THEME_FONTS = {
  barlow: { label: "Barlow Condensed", family: '"Barlow Condensed", "Barlow", sans-serif' },
  oswald: { label: "Oswald", family: '"Oswald", "Barlow Condensed", sans-serif' },
  bebas: { label: "Bebas Neue", family: '"Bebas Neue", "Barlow Condensed", sans-serif' },
  anton: { label: "Anton", family: '"Anton", "Barlow Condensed", sans-serif' },
} as const;

export type ThemeFont = keyof typeof THEME_FONTS;

/** Per-event look, stored in events.theme (jsonb). Only the first three keys are required. */
export type EventTheme = {
  background: string;
  text: string;
  accent: string;
  /** Card/panel surface. Default: text 6% into background. */
  panel?: string;
  /** Secondary text. Default: text 60% into background. */
  muted?: string;
  /** Secondary accent (confetti, podium). Default: accent. */
  accent2?: string;
  /** Confetti colors. Default: [accent, text, accent2]. */
  confetti?: string[];
  font?: ThemeFont;
  /** Public URL of a background image, drawn under an overlay of the background color. */
  bgImage?: string;
  /** 0 to 1, how much of the background color covers bgImage. Default 0.7. */
  bgOverlay?: number;
  /** Public URL of the event logo; only shown when useLogo is true. */
  logo?: string;
  useLogo?: boolean;
};

type ColorKey = "background" | "text" | "accent";

export const THEME_PRESETS: { name: string; theme: EventTheme }[] = [
  { name: "Carvão", theme: { background: "#0B0D10", text: "#F4F6F8", accent: "#22D3EE" } },
  { name: "Noite", theme: { background: "#0A1020", text: "#F1F5FF", accent: "#FBBF24" } },
  { name: "Claro", theme: { background: "#F5F5F0", text: "#111418", accent: "#0E7490" } },
];

export const DEFAULT_THEME = THEME_PRESETS[0].theme;

const HEX = /^#[0-9a-fA-F]{6}$/;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);
const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//.test(v);

export function parseTheme(json: Json | null | undefined): EventTheme {
  const t = (json && typeof json === "object" && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
  const pick = (k: ColorKey) => (isHex(t[k]) ? (t[k] as string) : DEFAULT_THEME[k]);
  const theme: EventTheme = { background: pick("background"), text: pick("text"), accent: pick("accent") };
  if (isHex(t.panel)) theme.panel = t.panel;
  if (isHex(t.muted)) theme.muted = t.muted;
  if (isHex(t.accent2)) theme.accent2 = t.accent2;
  if (Array.isArray(t.confetti)) {
    const c = t.confetti.filter(isHex).slice(0, 6);
    if (c.length) theme.confetti = c;
  }
  if (typeof t.font === "string" && t.font in THEME_FONTS) theme.font = t.font as ThemeFont;
  if (isUrl(t.bgImage)) theme.bgImage = t.bgImage;
  if (typeof t.bgOverlay === "number") theme.bgOverlay = Math.min(1, Math.max(0, t.bgOverlay));
  if (isUrl(t.logo)) theme.logo = t.logo;
  if (typeof t.useLogo === "boolean") theme.useLogo = t.useLogo;
  return theme;
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

/** Confetti colors for canvas-confetti. */
export function confettiColors(theme: EventTheme) {
  return theme.confetti ?? [theme.accent, theme.text, theme.accent2 ?? theme.accent];
}

/** CSS custom properties + base paint for a themed root element. */
export function themeStyle(theme: EventTheme): CSSProperties {
  const style: Record<string, string> = {
    "--sb-bg": theme.background,
    "--sb-text": theme.text,
    "--sb-accent": theme.accent,
    "--sb-accent2": theme.accent2 ?? theme.accent,
    "--sb-panel": theme.panel ?? `color-mix(in srgb, ${theme.text} 6%, ${theme.background})`,
    "--sb-muted": theme.muted ?? `color-mix(in srgb, ${theme.text} 60%, ${theme.background})`,
    "--sb-font": THEME_FONTS[theme.font ?? "barlow"].family,
    background: theme.background,
    color: theme.text,
  };
  if (theme.bgImage) {
    const o = theme.bgOverlay ?? 0.7;
    style.backgroundImage = `linear-gradient(color-mix(in srgb, ${theme.background} ${Math.round(o * 100)}%, transparent), color-mix(in srgb, ${theme.background} ${Math.round(o * 100)}%, transparent)), url("${theme.bgImage}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style as CSSProperties;
}
