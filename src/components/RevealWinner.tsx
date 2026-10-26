import { useState } from "react";
import { revealBgStyle } from "@/lib/theme";
import { useRevealTheme } from "@/components/RevealThemeProvider";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type WinnerTeam = {
  name: string;
  color: string;
  avatar_url?: string | null;
  photo_url?: string | null;
  total_points: number;
};

/** Winner screen shared by the day, game and final reveals: title, photo (or avatar), name, points. */
export const RevealWinner = ({
  title,
  eyebrow,
  winner,
}: {
  title: string;
  /** Optional line under the title, e.g. the game name */
  eyebrow?: string;
  winner: WinnerTeam;
}) => {
  const { theme } = useRevealTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  // Long custom titles wrap, so shrink them to keep photo, name and points on one screen
  const titleSize = title.length > 28 ? 7 : title.length > 16 ? 9 : 12;
  const showPhoto = !!winner.photo_url && !photoFailed;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[color:var(--sb-bg)] text-center"
      style={{ padding: "5vmin 6vmin", gap: "3.5vmin", ...revealBgStyle(theme, "bgWinner") }}
    >
      <div className="flex flex-col items-center" style={{ gap: "1.5vmin" }}>
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-black uppercase text-[color:var(--sb-accent)]"
          style={{ fontSize: `${titleSize}vmin`, lineHeight: 1.15, letterSpacing: "0.02em" }}
        >
          {title}
        </motion.h1>
        {eyebrow && (
          <p className="uppercase text-[color:var(--sb-muted)]" style={{ fontSize: "4vmin", letterSpacing: "0.12em" }}>
            {eyebrow}
          </p>
        )}
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center"
      >
        {showPhoto ? (
          <img
            src={winner.photo_url!}
            alt={winner.name}
            onError={() => setPhotoFailed(true)}
            className="rounded-2xl object-cover border-4"
            style={{ borderColor: winner.color, maxHeight: "44vh", maxWidth: "70vw" }}
          />
        ) : (
          <Avatar className="border-4" style={{ borderColor: winner.color, width: "32vmin", height: "32vmin" }}>
            <AvatarImage src={winner.avatar_url ?? undefined} alt={`${winner.name} team avatar`} />
            <AvatarFallback className="font-black" style={{ backgroundColor: winner.color, fontSize: "14vmin" }}>
              {winner.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center"
        style={{ gap: "1.5vmin" }}
      >
        <h2 className="font-black uppercase" style={{ color: winner.color, fontSize: "9vmin", lineHeight: 1.1 }}>
          {winner.name}
        </h2>
        <p className="text-[color:var(--sb-text)]" style={{ fontSize: "5vmin", lineHeight: 1.2 }}>
          {winner.total_points.toLocaleString("pt-BR")} pontos
        </p>
      </motion.div>
    </motion.div>
  );
};
