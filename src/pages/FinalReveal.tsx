import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useEventId } from '@/lib/useEventId';
import { useRevealScreen } from '@/lib/useRevealChannel';
import { Trophy, Star, Sparkles, Crown, ArrowLeft, TrendingUp, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import * as React from "react";
import { RevealThemeProvider, useRevealTheme } from '@/components/RevealThemeProvider';
import { TOP3_MIN_TEAMS } from '@/lib/revealTiming';
import { RevealWaiting } from '@/components/RevealWaiting';
import { RevealClosing } from '@/components/RevealClosing';
import { RevealWinner } from '@/components/RevealWinner';
import { RevealHeartbeat } from '@/components/RevealHeartbeat';
import { parseTheme, confettiColors } from '@/lib/theme';

interface Team {
  id: string;
  name: string;
  color: string;
  avatar_url: string;
  photo_url?: string | null;
  total_points: number;
  rank: number;
}

interface RevealPhase {
  type: 'countdown' | 'reveal' | 'pause' | 'climax' | 'top3' | 'winner_image' | 'celebration';
  position?: number; // Which position we're revealing (10, 9, 8, etc.)
  duration: number;
}

// CONFIGURABLE TIMING CONSTANTS - Adjust these as needed
const REVEAL_TIMING = {
  // Individual reveal durations
  BOTTOM_TIER: 3000,    // Positions 8+: 3s
  MID_LOW_TIER: 4000,   // Positions 6-7: 4s
  MID_HIGH_TIER: 5000,  // Position 5: 5s
  FOURTH_PLACE: 5000,   // Position 4 and below: 5s
  
  // Pause durations between reveals
  BOTTOM_PAUSE: 3000,   // After positions 8+: 3s
  MID_LOW_PAUSE: 5000,  // After positions 6-7: 5s
  MID_HIGH_PAUSE: 6000, // After the other positions: 6s
  PRE_TOP3_PAUSE: 12000, // Before the top 3 (or the winner when there is no top 3): 12s
  
  // Final sequence timing
  TOP3_DISPLAY: 5000,   // Show top 3: 5s
  WINNER_IMAGE: 30000,  // Show winner image: 30s
  CONFETTI_DELAY: 3000, // Start confetti 3s after the winner is shown
  CONFETTI_DURATION: 60000, // Confetti duration: 60s
  CELEBRATION: 30000,   // Final celebration: 30s
  
  // Initial phases
  COUNTDOWN: 7000,      // Initial countdown: 7s
  INITIALIZATION: 5000, // Loading phase: 5s
};

const FinalReveal = () => {
  const [revealState, setRevealState] = useState<'waiting' | 'initializing' | 'revealing' | 'complete'>('waiting');
  const [teams, setTeams] = useState<Team[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(new Set());
  const [currentPhase, setCurrentPhase] = useState<RevealPhase>({ type: 'countdown', duration: 5000 });
  const [isLoading, setIsLoading] = useState(false);
  const { eventId, event } = useEventId();

  // Dramatic timing schedule based on research
  const getRevealTiming = (position: number): number => {
    if (position >= 8) return REVEAL_TIMING.BOTTOM_TIER;
    if (position >= 6) return REVEAL_TIMING.MID_LOW_TIER;
    if (position >= 5) return REVEAL_TIMING.MID_HIGH_TIER;
    return REVEAL_TIMING.FOURTH_PLACE;
  };

  /** `stopAt` is the last position revealed one by one (4 with a top 3 step, 2 without). */
  const getPauseTiming = (position: number, stopAt: number): number => {
    if (position === stopAt) return REVEAL_TIMING.PRE_TOP3_PAUSE;
    if (position >= 8) return REVEAL_TIMING.BOTTOM_PAUSE;
    if (position >= 6) return REVEAL_TIMING.MID_LOW_PAUSE;
    return REVEAL_TIMING.MID_HIGH_PAUSE;
  };

  const handleStartFinalReveal = async () => {
    setIsLoading(true);
    setRevealState('initializing');
    
    try {
      // Fetch final rankings
      // An ended event replays from its saved snapshot so results cannot change
      const snapRows = event?.status === 'ended' && Array.isArray(event.final_snapshot)
        ? (event.final_snapshot as any[]).map((r) => ({
            team_id: r.team_id,
            total_points: r.total_points,
            teams: { id: r.team_id, name: r.name, color: r.color, avatar_url: r.avatar_url },
          }))
        : null;

      const { data: liveRows } = await supabase
        .from('team_aggregates')
        .select(`
          team_id,
          total_points,
          teams (
            id,
            name,
            color,
            avatar_url,
            photo_url
          )
        `)
        .eq('event_id', eventId!)
        .order('total_points', { ascending: false });

      const teamsData = snapRows ?? liveRows;
      if (teamsData) {
        const formattedTeams: Team[] = teamsData.map((item: any, index: number) => ({
          id: item.team_id,
          name: item.teams.name,
          color: item.teams.color,
          avatar_url: item.teams.avatar_url,
          photo_url: item.teams.photo_url ?? null,
          total_points: item.total_points,
          rank: index + 1
        }));
        
        setTeams(formattedTeams);
        
        // Start the reveal sequence after initialization
        setTimeout(() => {
          setRevealState('revealing');
          runFinalRevealSequence(formattedTeams);
        }, 2000);
      }
    } catch (error) {
      console.error('Error fetching final results:', error);
      setIsLoading(false);
    }
  };

  const runFinalRevealSequence = async (teamsList: Team[]) => {
    const totalTeams = teamsList.length;
    
    // Phase 1: Dramatic countdown
    setCurrentPhase({ type: 'countdown', duration: REVEAL_TIMING.COUNTDOWN });
    await wait(REVEAL_TIMING.COUNTDOWN);

    // The top 3 step only exists with enough teams; otherwise reveal down to 2nd place, then the winner
    const hasTop3 = totalTeams >= TOP3_MIN_TEAMS;
    // With 3 or fewer teams nothing is revealed one by one: countdown, tension pause, winner
    const stopAt = hasTop3 ? 4 : totalTeams <= 3 ? totalTeams + 1 : 2;

    // Phase 2: Bottom-up reveals
    for (let position = totalTeams; position >= stopAt; position--) {
      // Reveal this position
      setCurrentPhase({ 
        type: 'reveal', 
        position, 
        duration: getRevealTiming(position) 
      });
      
      setRevealedPositions(prev => new Set([...prev, position]));
      await wait(getRevealTiming(position));

      // Strategic pause after each reveal
      const pauseDuration = getPauseTiming(position, stopAt);
      if (pauseDuration > 0) {
        setCurrentPhase({ 
          type: 'pause', 
          position, 
          duration: pauseDuration 
        });
        await wait(pauseDuration);
      }
    }

    // Tension pause before the winner when there was no bottom-up reveal
    if (stopAt > totalTeams) {
      setCurrentPhase({ type: 'pause', position: 1, duration: REVEAL_TIMING.PRE_TOP3_PAUSE });
      await wait(REVEAL_TIMING.PRE_TOP3_PAUSE);
    }

    // Phase 3: Show Top 3 together (only with enough teams)
    if (hasTop3) {
      setCurrentPhase({ type: 'top3', duration: REVEAL_TIMING.TOP3_DISPLAY });
      setRevealedPositions(prev => new Set([...prev, 1, 2, 3]));
      await wait(REVEAL_TIMING.TOP3_DISPLAY);
    } else {
      setRevealedPositions(prev => new Set([...prev, 1]));
    }

    // Phase 4: Show Winner Image (confetti will start after 3 seconds automatically)
    setCurrentPhase({ type: 'winner_image', duration: REVEAL_TIMING.WINNER_IMAGE });
    await wait(REVEAL_TIMING.WINNER_IMAGE);

    // Phase 5: Final celebration (confetti continues from winner image phase)
    setCurrentPhase({ type: 'celebration', duration: REVEAL_TIMING.CELEBRATION });
    // Note: Confetti is still running from the winner image phase
    await wait(REVEAL_TIMING.CELEBRATION);
    
    setRevealState('complete');
  };

  const triggerVictoryConfetti = () => {
    const duration = REVEAL_TIMING.CONFETTI_DURATION; // 60 seconds
    const end = Date.now() + duration;
    const colors = confettiColors(parseTheme(event?.theme));

    (function frame() {
      // Multiple confetti bursts for epic victory celebration
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 90,
        spread: 45,
        origin: { x: 0.5, y: 0.8 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const triggerDelayedConfetti = () => {
    // Start confetti after 3 seconds when winner is shown
    setTimeout(() => {
      triggerVictoryConfetti();
    }, REVEAL_TIMING.CONFETTI_DELAY);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useRevealScreen(eventId, 'final', () => handleStartFinalReveal());

  return (
    <RevealThemeProvider event={event} kind="final">
    <div className="min-h-screen bg-[color:var(--sb-bg)] relative overflow-hidden">

      {/* Animated Background */}
      <div className="absolute inset-0">
        <DramaticBackground active={revealState === 'revealing'} phase={currentPhase} />
      </div>

      <AnimatePresence mode="wait">
        {revealState === 'waiting' && (
          <FinalRevealControlPanel onStartReveal={handleStartFinalReveal} isLoading={isLoading} />
        )}

        {revealState === 'initializing' && (
          <InitializationScreen />
        )}

        {revealState === 'revealing' && (
          <FinalRevealSpectacle 
            teams={teams}
            revealedPositions={revealedPositions}
            currentPhase={currentPhase}
            onTriggerConfetti={triggerDelayedConfetti}
          />
        )}

        {revealState === 'complete' && teams.length > 0 && (
          <FinalRevealComplete 
            winner={teams[0]}
            allTeams={teams}
          />
        )}
      </AnimatePresence>
    </div>
    </RevealThemeProvider>
  );
};

// Control Panel Component
const FinalRevealControlPanel = ({ isLoading }: { onStartReveal: () => void, isLoading: boolean }) => (
  <RevealWaiting status={isLoading ? 'PREPARANDO...' : 'Aguardando o início da apuração...'} />
);

// Initialization Screen
const InitializationScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[color:var(--sb-bg)] flex items-center justify-center"
    >
      <div className="text-center">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 3, repeat: Infinity }
          }}
          className="w-32 h-32 mx-auto mb-8 rounded-full border-8 border-[color:var(--sb-accent)] border-t-[color:var(--sb-accent2)] shadow-camp"
        />
        <h2 className="text-4xl font-black text-[color:var(--sb-text)] mb-4">
          PREPARANDO O PLACAR...
        </h2>
        <p className="text-[color:var(--sb-muted)] text-xl">
          Compilando os números...
        </p>
      </div>
    </motion.div>
  );
};

// Heartbeat Transition Component
const HeartbeatTransition = () => <RevealHeartbeat />;

// Top 3 Reveal Component
const Top3Reveal = ({ teams }: { teams: Team[] }) => {
  const { texts, fill } = useRevealTheme();
  const getTeamColorClass = (teamName: string) => {
    const name = teamName?.toLowerCase() || '';
    const colorMap: Record<string, string> = {
      blue: "team-blue", red: "team-red", green: "team-green",
      yellow: "team-yellow", purple: "team-purple", orange: "team-orange",
      pink: "team-pink", black: "team-black", grey: "team-grey", brown: "team-brown"
    };
    return colorMap[name] || "camp-cyan";
  };

  const top3Teams = teams.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-[color:var(--sb-bg)] backdrop-blur flex items-center justify-center z-30"
    >
      <div className="flex flex-col items-center justify-center">
        <motion.h1
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="text-6xl md:text-8xl font-black text-[color:var(--sb-accent)] mb-16 text-center"
        >
          {fill(texts.top3Title)}
        </motion.h1>
        
        <div className="flex justify-center items-end gap-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 shadow-lg" style={{ borderColor: top3Teams[1]?.color }}>
              <AvatarImage src={top3Teams[1]?.avatar_url} alt={`${top3Teams[1]?.name} team avatar`} />
              <AvatarFallback 
                className={`bg-${getTeamColorClass(top3Teams[1]?.name)} text-white font-bold text-2xl`}
                style={{ backgroundColor: top3Teams[1]?.color }}
              >
                {top3Teams[1]?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-3xl font-black text-[color:var(--sb-muted)] mb-2">2</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: top3Teams[1]?.color }}>
              {top3Teams[1]?.name}
            </h3>
            <p className="text-xl text-[color:var(--sb-muted)]">{top3Teams[1]?.total_points} pts</p>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <Avatar className="w-32 h-32 mx-auto mb-4 border-4 shadow-2xl" style={{ borderColor: top3Teams[0]?.color }}>
              <AvatarImage src={top3Teams[0]?.avatar_url} alt={`${top3Teams[0]?.name} team avatar`} />
              <AvatarFallback 
                className={`bg-${getTeamColorClass(top3Teams[0]?.name)} text-white font-bold text-4xl`}
                style={{ backgroundColor: top3Teams[0]?.color }}
              >
                {top3Teams[0]?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-4xl font-black text-[color:var(--sb-accent2)] mb-2">1</div>
            <Crown className="w-12 h-12 text-[color:var(--sb-accent2)] mx-auto mb-2 animate-bounce" />
            <h3 className="text-3xl font-black mb-2" style={{ color: top3Teams[0]?.color }}>
              {top3Teams[0]?.name}
            </h3>
            <p className="text-2xl text-[color:var(--sb-accent2)] font-bold">{top3Teams[0]?.total_points} pts</p>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <Avatar className="w-20 h-20 mx-auto mb-4 border-4 shadow-lg" style={{ borderColor: top3Teams[2]?.color }}>
              <AvatarImage src={top3Teams[2]?.avatar_url} alt={`${top3Teams[2]?.name} team avatar`} />
              <AvatarFallback 
                className={`bg-${getTeamColorClass(top3Teams[2]?.name)} text-white font-bold text-xl`}
                style={{ backgroundColor: top3Teams[2]?.color }}
              >
                {top3Teams[2]?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-2xl font-black text-[color:var(--sb-accent2)] mb-2">3</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: top3Teams[2]?.color }}>
              {top3Teams[2]?.name}
            </h3>
            <p className="text-lg text-[color:var(--sb-muted)]">{top3Teams[2]?.total_points} pts</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Winner Image Display Component
const WinnerImageDisplay = ({ winner, onTriggerConfetti }: { winner: Team, onTriggerConfetti: () => void }) => {
  const { texts, fill } = useRevealTheme();

  useEffect(() => {
    // Confetti starts a few seconds after the winner appears
    onTriggerConfetti();
  }, [onTriggerConfetti]);

  return <RevealWinner title={fill(texts.winnerTitle, { team: winner.name })} winner={winner} />;
};
const FinalRevealSpectacle = ({ 
  teams, 
  revealedPositions, 
  currentPhase,
  onTriggerConfetti 
}: { 
  teams: Team[], 
  revealedPositions: Set<number>, 
  currentPhase: RevealPhase,
  onTriggerConfetti: () => void
}) => {
  const { texts, fill } = useRevealTheme();
  // Show countdown
  if (currentPhase.type === 'countdown') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <motion.h1
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-8xl font-black text-[color:var(--sb-accent)] mb-8"
          >
            {fill(texts.countdownTitle)}
          </motion.h1>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-6xl font-bold text-[color:var(--sb-accent)]"
          >
            {fill(texts.countdownSubtitle)}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Show heartbeat transition for all pauses
  if (currentPhase.type === 'pause') {
    return <HeartbeatTransition />;
  }

  // Show Top 3 reveal
  if (currentPhase.type === 'top3') {
    return <Top3Reveal teams={teams} />;
  }

  // Show winner image
  if (currentPhase.type === 'winner_image') {
    return <WinnerImageDisplay winner={teams[0]} onTriggerConfetti={onTriggerConfetti} />;
  }

  // Main reveal grid (for individual team reveals)
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6 w-full">
            {teams.map((team) => {
              const isRevealed = revealedPositions.has(team.rank);
              const isCurrentlyRevealing = currentPhase.type === 'reveal' && currentPhase.position === team.rank;
              const isCelebration = currentPhase.type === 'celebration';
              
              if (!isRevealed && !isCurrentlyRevealing) {
                return (
                  <motion.div
                    key={team.id}
                    className="relative"
                  >
                    <Card className="bg-[color:var(--sb-panel)] border-dashed border-muted-foreground/30 h-64">
                      <CardContent className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-6xl font-black text-[color:var(--sb-muted)]/50 mb-2">
                            #{team.rank}
                          </div>
                          <div className="text-[color:var(--sb-muted)]">???</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              }

              return (
                <TeamRevealCard
                  key={team.id}
                  team={team}
                  isCurrentlyRevealing={isCurrentlyRevealing}
                  isCelebration={isCelebration && team.rank === 1}
                  revealDelay={isCurrentlyRevealing ? 0 : 0.5}
                />
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Individual Team Reveal Card
const TeamRevealCard = ({ 
  team, 
  isCurrentlyRevealing, 
  isCelebration, 
  revealDelay 
}: { 
  team: Team, 
  isCurrentlyRevealing: boolean, 
  isCelebration: boolean, 
  revealDelay: number 
}) => {
  const getTeamColorClass = (teamName: string) => {
    const name = teamName.toLowerCase();
    const colorMap: Record<string, string> = {
      blue: "team-blue", red: "team-red", green: "team-green",
      yellow: "team-yellow", purple: "team-purple", orange: "team-orange",
      pink: "team-pink", black: "team-black", grey: "team-grey", brown: "team-brown"
    };
    return colorMap[name] || "camp-cyan";
  };

  const teamColorClass = getTeamColorClass(team.name);

  return (
    <motion.div
      initial={{ 
        scale: 0,
        rotateY: -180,
        opacity: 0
      }}
      animate={{ 
        scale: isCelebration ? [1, 1.1, 1] : 1,
        rotateY: 0,
        opacity: 1
      }}
      transition={{ 
        delay: revealDelay,
        duration: isCurrentlyRevealing ? 1.2 : 0.8,
        type: "spring",
        scale: isCelebration ? { duration: 2, repeat: Infinity } : {}
      }}
    >
      <Card 
        className={`
          relative overflow-hidden transition-all duration-500
          ${isCurrentlyRevealing ? 'shadow-2xl scale-105' : ''}
          ${isCelebration ? 'animate-pulse shadow-2xl shadow-team-yellow/50' : ''}
          bg-[color:var(--sb-panel)]
          border-2 border-${teamColorClass}
        `}
        style={{
          borderColor: isCurrentlyRevealing || isCelebration ? team.color : undefined
        }}
      >
        {/* Rank Badge */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant={team.rank === 1 ? "default" : "secondary"} 
            className={`text-lg font-bold px-3 py-1 ${team.rank <= 3 ? 'animate-bounce' : ''}`}
          >
            {team.rank === 1 && <Crown className="w-4 h-4 mr-1" />}
            #{team.rank}
          </Badge>
        </div>

        {/* Special Icons for Top 3 */}
        {team.rank <= 3 && (
          <div className="absolute top-4 left-4">
            {team.rank === 1 && <Crown className="w-8 h-8 text-[color:var(--sb-accent2)] animate-bounce" />}
            {team.rank === 2 && <Trophy className="w-8 h-8 text-[color:var(--sb-muted)] animate-bounce" />}
            {team.rank === 3 && <Star className="w-8 h-8 text-[color:var(--sb-accent2)] animate-bounce" />}
          </div>
        )}

        {/* Current Reveal Spotlight */}
        {isCurrentlyRevealing && (
          <motion.div
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-[color:var(--sb-accent)] opacity-20 rounded-lg"
          />
        )}

        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-current" style={{ borderColor: team.color }}>
              <AvatarImage src={team.avatar_url} alt={`${team.name} team avatar`} />
              <AvatarFallback 
                className={`bg-${teamColorClass} text-white font-bold text-xl`}
                style={{ backgroundColor: team.color }}
              >
                {team.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1" style={{ color: team.color }}>
                {team.name}
              </h2>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6" style={{ color: team.color }} />
              <span className="text-lg font-semibold text-[color:var(--sb-muted)]">Pontos Finais</span>
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: revealDelay + 0.5, type: "spring" }}
              className="text-6xl font-black"
              style={{ color: team.color }}
            >
              {team.total_points}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Final Completion Screen
const FinalRevealComplete = ({
  winner,
}: {
  winner: Team,
  allTeams: Team[],
}) => {
  const { texts, fill } = useRevealTheme();
  const vars = { team: winner.name };
  return (
    <RevealClosing
      title={fill(texts.completeTitle, vars)}
      subtitle={fill(texts.completeSubtitle, vars)}
      teamColor={winner.color}
      detail={`Com ${winner.total_points.toLocaleString("pt-BR")} pontos!`}
    />
  );
};

// Dramatic Background Effects
const DramaticBackground = ({ active, phase }: { active: boolean, phase: RevealPhase }) => {
  if (!active) return null;

  const getIntensity = () => {
    if (phase.type === 'climax' || phase.type === 'celebration') return 1;
    if (phase.position && phase.position <= 3) return 0.8;
    if (phase.position && phase.position <= 6) return 0.6;
    return 0.4;
  };

  return (
    <>
      {/* Particle Field */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(Math.floor(50 * getIntensity()))].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              opacity: 0
            }}
            animate={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              opacity: [0, getIntensity(), 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            className="absolute w-2 h-2 bg-[color:var(--sb-accent)] rounded-full"
            style={{
              backgroundColor: Math.random() > 0.5 ? 'var(--sb-accent)' : 'var(--sb-accent2)'
            }}
          />
        ))}
      </div>

      {/* Spotlight Effect */}
      <motion.div
        animate={{ opacity: getIntensity() * 0.3 }}
        className="absolute inset-0 bg-[radial-gradient(circle,transparent,color-mix(in_srgb,var(--sb-accent)_20%,transparent))]"
      />
    </>
  );
};

export default FinalReveal;