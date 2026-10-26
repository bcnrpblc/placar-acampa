/** Day and game reveals share one calmer sequence; the final reveal keeps its own full drama in FinalReveal.tsx. */
export const SHORT_REVEAL_TIMING = {
  /** Mystery count-up of all teams */
  COUNT_UP: 6000,
  /** Heartbeat before the top 3 / winner */
  HEARTBEAT: 3000,
  /** Top 3 screen (only with at least TOP3_MIN_TEAMS teams) */
  TOP3: 4000,
  /** Winner screen, confetti runs for the same time */
  WINNER: 20000,
} as const;

/** The top 3 step only makes sense with enough teams. */
export const TOP3_MIN_TEAMS = 5;
