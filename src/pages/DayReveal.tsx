import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useEventId } from '@/lib/useEventId';
import { useRevealScreen } from '@/lib/useRevealChannel';
import { Trophy, Star, Sparkles, Crown, ArrowLeft, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import * as React from "react";
import { RevealThemeProvider, useRevealTheme } from '@/components/RevealThemeProvider';
import { SHORT_REVEAL_TIMING as T, TOP3_MIN_TEAMS } from '@/lib/revealTiming';
import { RevealWaiting } from '@/components/RevealWaiting';
import { RevealClosing } from '@/components/RevealClosing';
import { RevealWinner } from '@/components/RevealWinner';
import { RevealHeartbeat } from '@/components/RevealHeartbeat';
import { parseTheme, confettiColors } from '@/lib/theme';

const DayReveal = () => {
  const [revealState, setRevealState] = useState<'waiting' | 'locking' | 'revealing' | 'complete'>('waiting');
  const [selectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [snapshot, setSnapshot] = useState<any>(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const snapshotRef = React.useRef<any>(null);
  const { eventId, event } = useEventId();

  const handleStartReveal = async () => {
    setRevealState('locking');
    
    try {
      // Lock the day (create snapshot)
      const { data: teamsData } = await supabase
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

      if (teamsData) {
        const formattedSnapshot = {
          day: selectedDay,
          teams: teamsData.map((item: any, index: number) => ({
            id: item.team_id,
            name: item.teams.name,
            color: item.teams.color,
            avatar_url: item.teams.avatar_url,
            photo_url: item.teams.photo_url ?? null,
            total_points: item.total_points,
            rank: index + 1
          }))
        };
        
        snapshotRef.current = formattedSnapshot;
        setSnapshot(formattedSnapshot);
        
        // Wait 2 seconds then start reveal
        setTimeout(() => {
          setRevealState('revealing');
          runRevealSequence();
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating day snapshot:', error);
    }
  };

  const runRevealSequence = async () => {
    // Phase 1: mystery count-up
    setCurrentPhase(1);
    await wait(T.COUNT_UP);

    // Heartbeat before the reveal
    setCurrentPhase(1.5);
    await wait(T.HEARTBEAT);

    // Phase 2: top 3 spotlight, only with enough teams
    if ((snapshotRef.current?.teams.length ?? 0) >= TOP3_MIN_TEAMS) {
      setCurrentPhase(2);
      await wait(T.TOP3);
    }

    // Phase 3: winner celebration
    setCurrentPhase(3);
    triggerConfetti();
    await wait(T.WINNER);
    
    setRevealState('complete');
  };

  const triggerConfetti = () => {
    const duration = T.WINNER;
    const end = Date.now() + duration;

    const colors = confettiColors(parseTheme(event?.theme));

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useRevealScreen(eventId, 'day', () => handleStartReveal());

  return (
    <RevealThemeProvider event={event} kind="day">
    <div className="min-h-screen bg-[color:var(--sb-bg)] relative overflow-hidden">

      {/* Animated Background */}
      <div className="absolute inset-0">
        <ParticleField active={revealState === 'revealing'} />
        <SpotlightEffect active={revealState === 'revealing'} />
      </div>

      <AnimatePresence mode="wait">
        {revealState === 'waiting' && (
          <RevealControlPanel
            selectedDay={selectedDay}
            onStartReveal={handleStartReveal}
          />
        )}

        {revealState === 'locking' && (
          <LockingAnimation />
        )}

        {revealState === 'revealing' && snapshot && (
          <RevealSpectacle
            snapshot={snapshot}
            phase={currentPhase}
          />
        )}

        {revealState === 'complete' && snapshot && (
          <RevealComplete
            snapshot={snapshot}
          />
        )}
      </AnimatePresence>
    </div>
    </RevealThemeProvider>
  );
};

// Control Panel Component
const RevealControlPanel = ({ selectedDay, onStartReveal }: any) => {
  const getTodayFormatted = () => {
    const today = new Date();
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const day = today.getDate().toString().padStart(2, '0');
    return `${dayNames[today.getDay()]} - ${day} ${monthNames[today.getMonth()]}`;
  };
  return (
    <RevealWaiting
      status="Aguardando o início da apuração..."
      extra={
        <div
          className="flex items-center rounded-xl border border-[color:var(--sb-muted)] text-[color:var(--sb-text)]"
          style={{ gap: "2vmin", padding: "1.6vmin 3vmin", fontSize: "3.4vmin" }}
        >
          <Calendar style={{ width: "4vmin", height: "4vmin" }} className="text-[color:var(--sb-accent)]" />
          <span>{getTodayFormatted()}</span>
        </div>
      }
    />
  );
};

// Locking Animation Component
const LockingAnimation = () => {
  return (
    <div className="min-h-screen bg-[color:var(--sb-bg)]">
      <div className="container mx-auto px-4 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 mx-auto mb-8 rounded-full border-8 border-[color:var(--sb-accent)] border-t-[color:var(--sb-accent2)] shadow-camp"
          ></motion.div>
          <h2 className="text-4xl font-black text-[color:var(--sb-text)] mb-4">
            SOMANDO OS PONTOS...
          </h2>
          <p className="text-[color:var(--sb-muted)] text-xl">
            Preparando o resultado final...
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// Heartbeat Transition Component - 
const HeartbeatTransition = () => <RevealHeartbeat label="Preparando o resultado..." />;

// Reveal Spectacle Component
const RevealSpectacle = ({ snapshot, phase }: any) => {
  return (
    <div className="min-h-screen bg-[color:var(--sb-bg)]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center"
        >
          {/* Phase 1: All Teams Mystery Count Up */}
          {phase === 1 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-wrap justify-center items-stretch"
              style={{ gap: "3vmin", maxWidth: "94vw" }}
            >
              {(() => {
                // Phase 1: Show teams in randomized order to hide rankings
                const teamsToShow = [...snapshot.teams]
                  .sort(() => Math.random() - 0.5); // Randomize order
                
                return teamsToShow.map((team: any, index: number) => (
                  <TeamRevealCard
                    key={team.id}
                    team={team}
                    rank={team.rank}
                    highlighted={false}
                    delay={index * 0.2}
                    hideRanking={true}
                    phase={phase}
                  />
                ));
              })()}
            </motion.div>
          )}
      
          {phase === 1.5 && (
            <HeartbeatTransition />
          )}

          {phase >= 2 && phase < 3 && (  // <- Also change this condition
        <Top3Spotlight teams={snapshot.teams.slice(0, 3)} />
          )}

          {/* Phase 3: Winner Celebration */}
          {phase >= 3 && (
            <WinnerCelebration winner={snapshot.teams[0]} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Team Reveal Card Component  
const TeamRevealCard = ({ team, rank, highlighted, delay, hideRanking = false, phase = 1 }: any) => {
  const getTeamColorClass = (teamName: string) => {
    const name = teamName.toLowerCase();
    const colorMap: Record<string, string> = {
      blue: "team-blue",
      red: "team-red", 
      green: "team-green",
      yellow: "team-yellow",
      purple: "team-purple",
      orange: "team-orange",
      pink: "team-pink",
      black: "team-black",
      grey: "team-grey",
      brown: "team-brown"
    };
    return colorMap[name] || "camp-cyan";
  };

  const teamColorClass = getTeamColorClass(team.name);
  
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.6 }}
      style={{ width: "min(30vmin, 17vw)", minWidth: "200px", containerType: "inline-size" }}
    >
      <Card 
        className={`
          relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-elevation
          ${highlighted ? 'animate-leader-glow' : ''}
          bg-[color:var(--sb-panel)]
          border-2 border-border hover:border-${teamColorClass}
        `}
        style={{
          '--leader-color': highlighted ? team.color : 'transparent'
        } as React.CSSProperties}
      >
        {/* Rank Badge - Hidden in Phase 1 */}
        {!hideRanking && (
          <div className="absolute top-4 right-4">
            <Badge variant={rank === 1 ? "default" : "secondary"} className="text-lg font-bold px-3 py-1">
              {rank === 1 && <Trophy className="w-4 h-4 mr-1" />}
              #{rank}
            </Badge>
          </div>
        )}

        {/* Special Icons for Top 3 - Hidden in Phase 1 */}
        {!hideRanking && rank <= 3 && (
          <div className="absolute top-4 left-4">
            {rank === 1 && <Crown className="w-8 h-8 text-[color:var(--sb-accent2)] animate-bounce" />}
            {rank === 2 && <Trophy className="w-8 h-8 text-[color:var(--sb-muted)] animate-bounce" />}
            {rank === 3 && <Star className="w-8 h-8 text-[color:var(--sb-accent2)] animate-bounce" />}
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="border-2" style={{ borderColor: team.color, width: "22cqw", height: "22cqw" }}>
              <AvatarImage src={team.avatar_url} alt={`${team.name} team avatar`} />
              <AvatarFallback className={`bg-${teamColorClass} text-white font-bold text-xl`}>
                {team.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-bold mb-1" style={{ color: team.color, fontSize: "9cqw", lineHeight: 1.1 }}>
                {team.name}
              </h2>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp style={{ width: "6cqw", height: "6cqw", color: "var(--sb-accent)" }} />
              <span className="font-semibold text-[color:var(--sb-muted)]" style={{ fontSize: "6cqw" }}>Total de Pontos</span>
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.5, type: "spring" }}
              className="relative"
            >
              {/* Slot machine container */}
              <div 
                className="font-black"
                style={{ color: team.color, fontSize: "22cqw", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}
              >
                {phase === 1 && (
                  <div className="text-[color:var(--sb-muted)] mb-2" style={{ fontSize: "4.5cqw", letterSpacing: "0.1em" }}>
                    CALCULANDO...
                  </div>
                )}
                <AnimatedCounter 
                  target={team.total_points} 
                  phase={phase}
                  hideActualScore={phase === 1}
                />
                {phase === 1 && (
                  <div className="mt-2" style={{ fontSize: "6cqw" }}>
                    pontos
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Top 3 Spotlight Component - Fixed centering and scaling
const Top3Spotlight = ({ teams }: any) => {
  const { texts, fill } = useRevealTheme();
  const getTeamColorClass = (teamName: string) => {
    const name = teamName?.toLowerCase() || '';
    const colorMap: Record<string, string> = {
      blue: "team-blue",
      red: "team-red", 
      green: "team-green",
      yellow: "team-yellow",
      purple: "team-purple",
      orange: "team-orange",
      pink: "team-pink",
      black: "team-black",
      grey: "team-grey",
      brown: "team-brown"
    };
    return colorMap[name] || "camp-cyan";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-[color:var(--sb-bg)] backdrop-blur-sm z-20 overflow-hidden"
    >
      {/* True centering container that accounts for sidebar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center scale-[1.2] transform-gpu">
          <motion.h2
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="text-4xl md:text-6xl font-black text-[color:var(--sb-accent)] mb-16 md:mb-20 text-center whitespace-nowrap"
          >
            {fill(texts.top3Title)}
          </motion.h2>
          
          <div className="flex justify-center items-end gap-4 md:gap-8">
            {/* 2nd Place */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              {/* Avatar for 2nd place */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="mb-4"
              >
                <Avatar className="w-20 md:w-24 h-20 md:h-24 mx-auto border-4 shadow-lg" style={{ borderColor: teams[1]?.color }}>
                  <AvatarImage src={teams[1]?.avatar_url} alt={`${teams[1]?.name} team avatar`} />
                  <AvatarFallback 
                    className={`bg-${getTeamColorClass(teams[1]?.name)} text-white font-bold text-xl md:text-2xl`}
                  >
                    {teams[1]?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="text-2xl md:text-3xl font-black text-[color:var(--sb-muted)] mb-4">2</div>
              <h3 className="text-xl md:text-2xl font-bold text-[color:var(--sb-text)] mb-2" style={{ color: teams[1]?.color }}>
                {teams[1]?.name}
              </h3>
              <p className="text-lg md:text-xl text-[color:var(--sb-muted)]">{teams[1]?.total_points} pts</p>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center"
            >
              {/* Avatar for 1st place */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
                className="mb-4"
              >
                <Avatar className="w-28 md:w-32 h-28 md:h-32 mx-auto border-4 shadow-2xl" style={{ borderColor: teams[0]?.color }}>
                  <AvatarImage src={teams[0]?.avatar_url} alt={`${teams[0]?.name} team avatar`} />
                  <AvatarFallback 
                    className={`bg-${getTeamColorClass(teams[0]?.name)} text-white font-bold text-3xl md:text-4xl`}
                  >
                    {teams[0]?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="text-3xl md:text-4xl font-black text-[color:var(--sb-accent2)] mb-2">1</div>
              <Crown className="w-10 md:w-12 h-10 md:h-12 text-[color:var(--sb-accent2)] mx-auto mb-2 animate-bounce" />
              <h3 className="text-2xl md:text-3xl font-black text-[color:var(--sb-text)] mb-2" style={{ color: teams[0]?.color }}>
                {teams[0]?.name}
              </h3>
              <p className="text-xl md:text-2xl text-[color:var(--sb-accent2)] font-bold">{teams[0]?.total_points} pts</p>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              {/* Avatar for 3rd place */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.0, type: "spring" }}
                className="mb-4"
              >
                <Avatar className="w-16 md:w-20 h-16 md:h-20 mx-auto border-4 shadow-lg" style={{ borderColor: teams[2]?.color }}>
                  <AvatarImage src={teams[2]?.avatar_url} alt={`${teams[2]?.name} team avatar`} />
                  <AvatarFallback 
                    className={`bg-${getTeamColorClass(teams[2]?.name)} text-white font-bold text-lg md:text-xl`}
                  >
                    {teams[2]?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="text-xl md:text-2xl font-black text-[color:var(--sb-accent2)] mb-4">3</div>
              <h3 className="text-lg md:text-xl font-bold text-[color:var(--sb-text)] mb-2" style={{ color: teams[2]?.color }}>
                {teams[2]?.name}
              </h3>
              <p className="text-base md:text-lg text-[color:var(--sb-muted)]">{teams[2]?.total_points} pts</p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Winner Celebration Component
const WinnerCelebration = ({ winner }: any) => {
  const { texts, fill } = useRevealTheme();
  return <RevealWinner title={fill(texts.winnerTitle, { team: winner.name })} winner={winner} />;
};

// Reveal Complete Component
const RevealComplete = ({ snapshot }: any) => {
  const { texts, fill } = useRevealTheme();
  const winner = snapshot.teams[0];
  const vars = { team: winner.name };
  return (
    <RevealClosing
      title={fill(texts.completeTitle, vars)}
      subtitle={fill(texts.completeSubtitle, vars)}
      teamColor={winner.color}
      detail={`${winner.total_points.toLocaleString('pt-BR')} pontos`}
    />
  );
};

// Particle Field Background Effect
const ParticleField = ({ active }: { active: boolean }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(50)].map((_, i) => (
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
            opacity: [0, 1, 0]
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
  );
};

// Spotlight Effect
const SpotlightEffect = ({ active }: { active: boolean }) => {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3 }}
      className="absolute inset-0 bg-[radial-gradient(circle,transparent,color-mix(in_srgb,var(--sb-accent)_20%,transparent))]"
    />
  );
};

// Animated Counter Component
// Animated Counter Component
// Animated Counter Component - Slot Machine Style
const AnimatedCounter = ({ target, phase = 1, hideActualScore = false }: { target: number, phase?: number, hideActualScore?: boolean }) => {
  const [display, setDisplay] = useState<string | number>(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (hideActualScore) {
      // Phase 1: Slot machine effect
      setIsSpinning(true);
      const duration = 10000; // 5 seconds total
      let elapsed = 0;
      let changeSpeed = 50; // Start fast
      
      const timer = setInterval(() => {
        elapsed += changeSpeed;
        
        if (elapsed >= duration) {
          // Final dramatic pause
          setDisplay("???");
          setIsSpinning(false);
          clearInterval(timer);
          return;
        }
        
        // Gradually slow down the changes (slot machine slowing effect)
        const progress = elapsed / duration;
        changeSpeed = 50 + (progress * 150); // Slows from 50ms to 200ms
        
        // Chance to update decreases over time (creates slowing effect)
        const updateChance = 1 - (progress * 0.8);
        
        if (Math.random() < updateChance) {
          // Generate realistic camp scores
          const minScore = 50;
          const maxScore = 500;
          const fakeScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
          setDisplay(fakeScore);
        }
      }, changeSpeed);

      return () => clearInterval(timer);
    } else {
      // Phase 2+: Show actual score immediately
      setIsSpinning(false);
      setDisplay(target);
    }
  }, [target, hideActualScore]);

  return (
    <span className={isSpinning ? "animate-pulse" : ""}>
      {display}
    </span>
  );
};

export default DayReveal;