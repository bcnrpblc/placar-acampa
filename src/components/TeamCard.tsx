import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { readableOn } from "@/lib/theme";
import { useEffect, useRef, useState } from "react";

export interface Team {
  id: string;
  name: string;
  color: string;
  avatar_url?: string;
  total_points: number;
}

interface TeamCardProps {
  team: Team;
  rank: number;
  isLeader?: boolean;
  previousPoints?: number;
  /** True for a few seconds after this team takes the lead. */
  highlightNew?: boolean;
}

/**
 * Scoreboard card. Colors come from the CSS variables --sb-bg / --sb-text set by the
 * page (event theme); the team color is the only other color. Sizes use cqmin so the
 * card scales to any grid cell (TV friendly). No outer glow: nothing leaves the card.
 */
export const TeamCard = ({ team, rank, isLeader, previousPoints, highlightNew }: TeamCardProps) => {
  const [animatedPoints, setAnimatedPoints] = useState(previousPoints ?? team.total_points);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const lastShown = useRef(previousPoints ?? team.total_points);

  // Count up from the last shown value; flash the card when it receives points
  useEffect(() => {
    const from = previousPoints ?? lastShown.current;
    lastShown.current = team.total_points;
    if (from === team.total_points) {
      setAnimatedPoints(team.total_points);
      return;
    }

    if (team.total_points > from) setFlashKey((k) => k + 1);
    setIsAnimating(true);
    const steps = 30;
    const increment = (team.total_points - from) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setAnimatedPoints(Math.round(from + increment * currentStep));
      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedPoints(team.total_points);
        setIsAnimating(false);
      }
    }, 1000 / steps);

    return () => clearInterval(interval);
  }, [team.total_points, previousPoints]);

  const onColor = readableOn(team.color);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        containerType: "size",
        borderRadius: "2cqmin",
        background: "var(--sb-panel)",
        border: "1px solid color-mix(in srgb, var(--sb-text) 16%, var(--sb-bg))",
        color: "var(--sb-text)",
      }}
    >
      {/* Team color band; thicker for the leader */}
      <div style={{ height: isLeader ? "3.5cqmin" : "1.8cqmin", background: team.color }} />

      {flashKey > 0 && (
        <div
          key={flashKey}
          className="sb-flash absolute inset-0 pointer-events-none"
          style={{ background: team.color }}
        />
      )}

      <div className="absolute flex items-center" style={{ top: "6cqmin", right: "4cqmin", gap: "2cqmin" }}>
        {isLeader && (
          <span
            className="font-bold uppercase"
            style={{
              background: team.color,
              color: onColor,
              fontSize: "4.5cqmin",
              padding: "0.8cqmin 2.2cqmin",
              borderRadius: "1cqmin",
              letterSpacing: "0.08em",
            }}
          >
            {highlightNew ? "Novo líder" : "Líder"}
          </span>
        )}
        <span className="font-extrabold opacity-70" style={{ fontSize: "8cqmin" }}>
          #{rank}
        </span>
      </div>

      <div
        className="h-full flex flex-col items-center justify-center text-center"
        style={{ gap: "3cqmin", padding: "6cqmin", paddingTop: "10cqmin" }}
      >
        <Avatar style={{ width: "30cqmin", height: "30cqmin", border: `0.8cqmin solid ${team.color}` }}>
          <AvatarImage src={team.avatar_url} alt={team.name} />
          <AvatarFallback
            className="font-extrabold"
            style={{ backgroundColor: team.color, color: onColor, fontSize: "13cqmin" }}
          >
            {team.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h2 className="font-extrabold uppercase leading-none line-clamp-2" style={{ fontSize: "8cqmin", letterSpacing: "0.02em" }}>
          {team.name}
        </h2>

        <div>
          <div
            className="font-extrabold leading-none"
            style={{
              color: team.color,
              fontSize: isLeader ? "30cqmin" : "26cqmin",
              fontVariantNumeric: "tabular-nums",
              opacity: isAnimating ? 0.9 : 1,
            }}
          >
            {animatedPoints.toLocaleString("pt-BR")}
          </div>
          <div className="font-semibold uppercase opacity-60" style={{ fontSize: "4cqmin", letterSpacing: "0.15em", fontFamily: "Barlow, sans-serif" }}>
            pontos
          </div>
        </div>
      </div>
    </div>
  );
};
