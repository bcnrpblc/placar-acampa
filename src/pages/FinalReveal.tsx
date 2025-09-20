import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Sparkles, Crown, ArrowLeft, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import * as React from "react";

interface Team {
  id: string;
  name: string;
  color: string;
  avatar_url: string;
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
  BOTTOM_TIER: 3000,    // Positions 8-10: 2s
  MID_LOW_TIER: 4000,   // Positions 6-7: 3s
  MID_HIGH_TIER: 5000,  // Positions 4-5: 4s
  FOURTH_PLACE: 5000,   // 4th place: 4s
  
  // Pause durations between reveals
  BOTTOM_PAUSE: 3000,   // After positions 8-10: 1.5s
  MID_LOW_PAUSE: 5000,  // After positions 6-7: 2.5s
  MID_HIGH_PAUSE: 6000, // After positions 4-5: 4s
  PRE_TOP3_PAUSE: 12000, // After 4th place: 10s (configurable)
  
  // Final sequence timing
  TOP3_DISPLAY: 5000,   // Show top 3: 5s (configurable)
  WINNER_IMAGE: 30000,  // Show winner image: 30s (configurable)
  CONFETTI_DELAY: 3000, // Start confetti after 3s when winner shown (configurable)
  CONFETTI_DURATION: 60000, // Confetti duration: 1 minute (configurable)
  CELEBRATION: 30000,   // Final celebration: 30s
  
  // Initial phases
  COUNTDOWN: 7000,      // Initial countdown: 5s
  INITIALIZATION: 5000, // Loading phase: 2s
};

const FinalReveal = () => {
  const [revealState, setRevealState] = useState<'waiting' | 'initializing' | 'revealing' | 'complete'>('waiting');
  const [teams, setTeams] = useState<Team[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(new Set());
  const [currentPhase, setCurrentPhase] = useState<RevealPhase>({ type: 'countdown', duration: 5000 });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Dramatic timing schedule based on research
  const getRevealTiming = (position: number): number => {
    if (position >= 8) return REVEAL_TIMING.BOTTOM_TIER;
    if (position >= 6) return REVEAL_TIMING.MID_LOW_TIER;
    if (position >= 5) return REVEAL_TIMING.MID_HIGH_TIER;
    if (position === 4) return REVEAL_TIMING.FOURTH_PLACE;
    return 0; // Top 3 handled separately
  };

  const getPauseTiming = (position: number): number => {
    if (position >= 8) return REVEAL_TIMING.BOTTOM_PAUSE;
    if (position >= 6) return REVEAL_TIMING.MID_LOW_PAUSE;
    if (position >= 5) return REVEAL_TIMING.MID_HIGH_PAUSE;
    if (position === 4) return REVEAL_TIMING.PRE_TOP3_PAUSE; // 10 second pause before top 3
    return 0;
  };

  const handleStartFinalReveal = async () => {
    setIsLoading(true);
    setRevealState('initializing');
    
    try {
      // Fetch final rankings
      const { data: teamsData } = await supabase
        .from('team_aggregates')
        .select(`
          team_id,
          total_points,
          teams (
            id,
            name,
            color,
            avatar_url
          )
        `)
        .order('total_points', { ascending: false });

      if (teamsData) {
        const formattedTeams: Team[] = teamsData.map((item: any, index: number) => ({
          id: item.team_id,
          name: item.teams.name,
          color: item.teams.color,
          avatar_url: item.teams.avatar_url,
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

    // Phase 2: Bottom-up reveals STOPPING AT 4TH PLACE
    for (let position = totalTeams; position >= 4; position--) {
      // Reveal this position
      setCurrentPhase({ 
        type: 'reveal', 
        position, 
        duration: getRevealTiming(position) 
      });
      
      setRevealedPositions(prev => new Set([...prev, position]));
      await wait(getRevealTiming(position));

      // Strategic pause after each reveal
      const pauseDuration = getPauseTiming(position);
      if (pauseDuration > 0) {
        setCurrentPhase({ 
          type: 'pause', 
          position, 
          duration: pauseDuration 
        });
        await wait(pauseDuration);
      }
    }

    // Phase 3: Show Top 3 together for 5 seconds
    setCurrentPhase({ type: 'top3', duration: REVEAL_TIMING.TOP3_DISPLAY });
    // Reveal top 3 positions
    setRevealedPositions(prev => new Set([...prev, 1, 2, 3]));
    await wait(REVEAL_TIMING.TOP3_DISPLAY);

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
    const colors = ['#23dbf3', '#ee1147', '#ffffff', '#ffd700'];

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

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          size="sm"
          className="bg-card/50 backdrop-blur-sm border-camp-cyan/20 text-foreground hover:bg-card/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

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
            onReset={() => {
              setRevealState('waiting');
              setRevealedPositions(new Set());
              setTeams([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Control Panel Component
const FinalRevealControlPanel = ({ onStartReveal, isLoading }: { onStartReveal: () => void, isLoading: boolean }) => {
  return (
    <div className="min-h-screen bg-gradient-glow">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-4xl"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20 transform scale-110 origin-center">
            <CardHeader className="text-center">
              <CardTitle className="text-6xl md:text-9xl font-black bg-gradient-camp bg-clip-text text-transparent mb-4">
                APURAÇÃO FINAL
              </CardTitle>
              <p className="text-xl md:text-2xl text-muted-foreground mb-2">Acampamento 25+</p>
              <div className="text-xl text-muted-foreground mt-2">
                "Sede, pois, imitadores de Deus, como filhos amados" - Efésios 5:1
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="bg-team-yellow/20 border-team-yellow/50 hidden">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="text-team-yellow text-xl">🏆</div>
                  <div>
                    <p className="text-team-yellow font-semibold mb-1">Momento Especial!</p>
                    <p className="text-muted-foreground text-sm">
                      Este é o momento final do acampamento. A revelação acontecerá de forma 
                      dramática, do último colocado ao grande vencedor!
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={onStartReveal}
                disabled={isLoading}
                className="w-full py-6 text-4xl font-black rounded-xl
                         bg-gradient-camp hover:opacity-90
                         transform hover:scale-105 active:scale-95 transition-all
                         shadow-elevation disabled:opacity-50"
              >
                <Crown className="w-8 h-8 mr-3" />
                {isLoading ? 'PREPARANDO...' : 'INICIAR APURAÇÃO FINAL'}
                <Crown className="w-8 h-8 ml-3" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

// Initialization Screen
const InitializationScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-glow flex items-center justify-center"
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
          className="w-32 h-32 mx-auto mb-8 rounded-full border-8 border-camp-cyan border-t-camp-pink shadow-camp"
        />
        <h2 className="text-4xl font-black text-foreground mb-4">
          PREPARANDO O PLACAR...
        </h2>
        <p className="text-muted-foreground text-xl">
          Compilando os números...
        </p>
      </div>
    </motion.div>
  );
};

// Heartbeat Transition Component
const HeartbeatTransition = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
    >
      {/* Multiple pulsing layers for depth */}
      <div className="relative">
        {/* Outer pulse ring */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 w-64 h-64 -translate-x-32 -translate-y-32 
                     rounded-full bg-camp-cyan/30 blur-xl"
        />
        
        {/* Middle pulse ring */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute inset-0 w-48 h-48 -translate-x-24 -translate-y-24 
                     rounded-full bg-camp-cyan/50 blur-lg"
        />
        
        {/* Core heartbeat */}
        <motion.div
          animate={{
            scale: [1, 1.2, 0.9, 1],
            boxShadow: [
              "0 0 0 0 rgba(35, 219, 243, 0.7)",
              "0 0 0 40px rgba(35, 219, 243, 0)",
              "0 0 0 0 rgba(35, 219, 243, 0)",
              "0 0 0 0 rgba(35, 219, 243, 0.7)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-camp-cyan to-camp-pink 
                     shadow-2xl shadow-camp-cyan/50"
        />
      </div>
    </motion.div>
  );
};

// Top 3 Reveal Component
const Top3Reveal = ({ teams }: { teams: Team[] }) => {
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
      className="fixed inset-0 bg-gradient-dark/95 backdrop-blur flex items-center justify-center z-30"
    >
      <div className="flex flex-col items-center justify-center">
        <motion.h1
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="text-6xl md:text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-16 text-center"
        >
          TOP 3!
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
            <div className="text-3xl font-black text-muted-foreground mb-2">2</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: top3Teams[1]?.color }}>
              {top3Teams[1]?.name}
            </h3>
            <p className="text-xl text-muted-foreground">{top3Teams[1]?.total_points} pts</p>
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
            <div className="text-4xl font-black text-team-yellow mb-2">1</div>
            <Crown className="w-12 h-12 text-team-yellow mx-auto mb-2 animate-bounce" />
            <h3 className="text-3xl font-black mb-2" style={{ color: top3Teams[0]?.color }}>
              {top3Teams[0]?.name}
            </h3>
            <p className="text-2xl text-team-yellow font-bold">{top3Teams[0]?.total_points} pts</p>
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
            <div className="text-2xl font-black text-team-orange mb-2">3</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: top3Teams[2]?.color }}>
              {top3Teams[2]?.name}
            </h3>
            <p className="text-lg text-muted-foreground">{top3Teams[2]?.total_points} pts</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Winner Image Display Component
const WinnerImageDisplay = ({ winner, onTriggerConfetti }: { winner: Team, onTriggerConfetti: () => void }) => {
  useEffect(() => {
    // Trigger confetti after 3 seconds when component mounts
    onTriggerConfetti();
  }, [onTriggerConfetti]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-gradient-dark/95 backdrop-blur flex items-center justify-center z-30"
    >
      <div className="text-center max-w-4xl mx-auto px-4">
        <motion.h1
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl md:text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-8"
        >
          É CAMPEÃ!!!
        </motion.h1>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <img
            src="/RED-206.jpg"
            className="max-w-full max-h-96 mx-auto rounded-2xl shadow-2xl border-4"
            style={{ borderColor: winner.color }}
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          {/* Fallback content if image fails */}
          <div 
            className="hidden bg-card/95 backdrop-blur-sm rounded-2xl p-12 shadow-elevation border-4"
            style={{ borderColor: winner.color }}
          >
            <Avatar className="w-32 h-32 mx-auto mb-6 border-4 shadow-2xl" style={{ borderColor: winner.color }}>
              <AvatarImage src={winner.avatar_url} alt={`${winner.name} team avatar`} />
              <AvatarFallback 
                className="text-white text-6xl font-black"
                style={{ backgroundColor: winner.color }}
              >
                {winner.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-6xl font-black mb-4" style={{ color: winner.color }}>
              {winner.name}
            </h2>
            <div className="text-4xl font-bold text-foreground">
              {winner.total_points} pontos
            </div>
          </div>
        </motion.div>

        <motion.h2
          className="text-4xl font-bold mb-4"
          style={{ color: winner.color }}
        >
          {winner.name}
        </motion.h2>
        <p className="text-2xl text-muted-foreground">
          {winner.total_points} pontos
        </p>
      </div>
    </motion.div>
  );
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
            className="text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-8"
          >
            CHEGOU A HORA...
          </motion.h1>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-6xl font-bold text-camp-cyan"
          >
            INICIANDO A APURAÇÃO!
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
      <div className="container mx-auto px-4 py-8">
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
                    <Card className="bg-card/20 border-dashed border-muted-foreground/30 h-64">
                      <CardContent className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-6xl font-black text-muted-foreground/50 mb-2">
                            #{team.rank}
                          </div>
                          <div className="text-muted-foreground">???</div>
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
          ${isCurrentlyRevealing ? 'shadow-2xl shadow-camp-cyan/50 scale-105' : ''}
          ${isCelebration ? 'animate-pulse shadow-2xl shadow-team-yellow/50' : ''}
          bg-gradient-to-br from-card via-card to-card/50
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
            {team.rank === 1 && <Crown className="w-8 h-8 text-team-yellow animate-bounce" />}
            {team.rank === 2 && <Trophy className="w-8 h-8 text-muted-foreground animate-bounce" />}
            {team.rank === 3 && <Star className="w-8 h-8 text-team-orange animate-bounce" />}
          </div>
        )}

        {/* Current Reveal Spotlight */}
        {isCurrentlyRevealing && (
          <motion.div
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-camp-cyan/20 rounded-lg"
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
              <span className="text-lg font-semibold text-muted-foreground">Pontos Finais</span>
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
  allTeams, 
  onReset 
}: { 
  winner: Team, 
  allTeams: Team[], 
  onReset: () => void 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-glow"
    >
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-center w-full max-w-4xl"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardContent className="text-center space-y-8 p-8">
              <motion.h1
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl font-black bg-gradient-camp bg-clip-text text-transparent mb-8"
              >
                ACAMPAMENTO 25+ FINALIZADO!
              </motion.h1>
              
              <div className="bg-gradient-to-r from-transparent via-camp-cyan/20 to-transparent p-8 rounded-xl">
                <h2 className="text-4xl font-bold mb-4" style={{ color: winner.color }}>
                  GRANDE VENCEDOR: {winner.name}
                </h2>
                <p className="text-2xl text-muted-foreground">
                  Com {winner.total_points} pontos!
                </p>
              </div>
              
              <div className="space-y-4">
                <Button
                  onClick={onReset}
                  className="px-8 py-4 text-xl font-bold rounded-xl
                           bg-gradient-camp hover:opacity-90
                           transform hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Nova Revelação
                </Button>
                
                <div className="text-muted-foreground">
                  <p className="text-lg">"Sede, pois, imitadores de Deus, como filhos amados"</p>
                  <p className="text-sm mt-2">Efésios 5:1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
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
            className="absolute w-2 h-2 bg-camp-cyan rounded-full"
            style={{
              backgroundColor: Math.random() > 0.5 ? '#23dbf3' : '#ee1147'
            }}
          />
        ))}
      </div>

      {/* Spotlight Effect */}
      <motion.div
        animate={{ opacity: getIntensity() * 0.3 }}
        className="absolute inset-0 bg-gradient-radial from-transparent via-camp-cyan/20 to-camp-pink/20"
      />
    </>
  );
};

export default FinalReveal;