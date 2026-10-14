import type { CSSProperties, ReactNode } from "react";
import { parseTheme, themeStyle } from "@/lib/theme";
import type { Json } from "@/integrations/supabase/types";

/** Paints the event theme (CSS vars, font, bg image) on its subtree. Used by scoreboard and reveals. */
export const ThemeScope = ({
  theme,
  className,
  style,
  children,
}: {
  theme: Json | null | undefined;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) => (
  <div className={className} style={{ fontFamily: "var(--sb-font)", fontSynthesis: "none", ...themeStyle(parseTheme(theme)), ...style }}>
    {children}
  </div>
);
