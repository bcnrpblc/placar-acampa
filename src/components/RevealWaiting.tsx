import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { revealBgStyle } from "@/lib/theme";
import { useRevealTheme } from "@/components/RevealThemeProvider";

/**
 * Waiting screen shared by the day, game and final reveals. Sizes are in vmin so it reads
 * from across the room. `icon` sits above the title, `extra` between the subtitle and the status.
 */
export const RevealWaiting = ({
  status,
  icon,
  extra,
}: {
  status: string;
  icon?: ReactNode;
  extra?: ReactNode;
}) => {
  const { texts, theme } = useRevealTheme();
  const titleSize = texts.title.length > 24 ? 8 : texts.title.length > 16 ? 10 : 13;
  return (
    <div className="min-h-screen bg-[color:var(--sb-bg)] flex items-center justify-center px-4" style={revealBgStyle(theme, "bgWaiting")}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-[90vw]"
      >
        <div
          className="flex flex-col items-center text-center rounded-2xl border border-[color:var(--sb-accent)] bg-[color:var(--sb-panel)]"
          style={{ padding: "7vmin 6vmin", gap: "4vmin" }}
        >
          <div className="flex flex-col items-center" style={{ gap: "3vmin" }}>
            {icon && <div className="text-[color:var(--sb-accent)]">{icon}</div>}
            <h1
              className="font-black uppercase text-[color:var(--sb-accent)]"
              style={{ fontSize: `${titleSize}vmin`, lineHeight: 1.15, letterSpacing: "0.02em" }}
            >
              {texts.title}
            </h1>
            <div style={{ width: "18vmin", height: "0.6vmin", background: "var(--sb-accent)" }} />
            {texts.subtitle && (
              <p
                className="uppercase text-[color:var(--sb-muted)]"
                style={{ fontSize: "4.2vmin", lineHeight: 1.3, letterSpacing: "0.12em" }}
              >
                {texts.subtitle}
              </p>
            )}
            {texts.verse && (
              <p className="text-[color:var(--sb-muted)]" style={{ fontSize: "3vmin", lineHeight: 1.4 }}>
                "{texts.verse}"{texts.verseRef && ` - ${texts.verseRef}`}
              </p>
            )}
          </div>

          {extra}

          <p
            className="font-bold text-[color:var(--sb-text)] animate-pulse"
            style={{ fontSize: "4vmin", lineHeight: 1.3, marginTop: "2vmin" }}
          >
            {status}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
