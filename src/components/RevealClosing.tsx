import { motion } from "framer-motion";
import { useRevealTheme } from "@/components/RevealThemeProvider";

/** Closing card shared by the day, game and final reveals. */
export const RevealClosing = ({
  title,
  subtitle,
  teamColor,
  detail,
}: {
  title: string;
  subtitle: string;
  /** Color of the winning team, used for the subtitle line */
  teamColor?: string;
  detail?: string;
}) => {
  const { texts } = useRevealTheme();
  const titleSize = title.length > 28 ? 6.5 : title.length > 18 ? 8 : 10;
  return (
    <div className="min-h-screen bg-[color:var(--sb-bg)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[90vw]"
      >
        <div
          className="flex flex-col items-center text-center rounded-2xl border border-[color:var(--sb-accent)] bg-[color:var(--sb-panel)]"
          style={{ padding: "7vmin 6vmin", gap: "4vmin" }}
        >
          <h1
            className="font-black uppercase text-[color:var(--sb-accent)]"
            style={{ fontSize: `${titleSize}vmin`, lineHeight: 1.15, letterSpacing: "0.02em" }}
          >
            {title}
          </h1>
          <div style={{ width: "18vmin", height: "0.6vmin", background: "var(--sb-accent)" }} />
          <div className="flex flex-col items-center" style={{ gap: "1.5vmin" }}>
            {subtitle && (
              <p
                className="font-bold uppercase"
                style={{
                  fontSize: "6vmin",
                  lineHeight: 1.2,
                  color: teamColor ?? "var(--sb-text)",
                }}
              >
                {subtitle}
              </p>
            )}
            {detail && (
              <p className="text-[color:var(--sb-text)]" style={{ fontSize: "4vmin", lineHeight: 1.3 }}>
                {detail}
              </p>
            )}
          </div>
          {texts.verse && (
            <p className="text-[color:var(--sb-muted)]" style={{ fontSize: "3vmin", lineHeight: 1.4 }}>
              "{texts.verse}"{texts.verseRef && ` - ${texts.verseRef}`}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
