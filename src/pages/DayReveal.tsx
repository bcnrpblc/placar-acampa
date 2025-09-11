import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Sparkles, Crown, ArrowLeft, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import * as React from "react";

const DayReveal = () => {
  const [revealState, setRevealState] = useState<'waiting' | 'locking' | 'revealing' | 'complete'>('waiting');
  const [selectedDay, setSelectedDay] = useState('2024-09-13');
  const [snapshot, setSnapshot] = useState<any>(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const navigate = useNavigate();

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
            avatar_url
          )
        `)
        .order('total_points', { ascending: false });

      if (teamsData) {
        const formattedSnapshot = {
          day: selectedDay,
          teams: teamsData.map((item: any, index: number) => ({
            id: item.team_id,
            name: item.teams.name,
            color: item.teams.color,
            avatar_url: item.teams.avatar_url,
            total_points: item.total_points,
            rank: index + 1
          }))
        };
        
        setSnapshot(formattedSnapshot);
        
        // Wait 2 seconds then start reveal
        setTimeout(() => {
          setRevealState('revealing');
          runRevealSequence();
        }, 200);
      }
    } catch (error) {
      console.error('Error creating day snapshot:', error);
    }
  };

  const runRevealSequence = async () => {
    // Phase 1: Show all teams counting up (3s)
    setCurrentPhase(1);
    await wait(3000);
    
    // Phase 2: Spotlight top 3 (2s each = 6s total)
    setCurrentPhase(2);
    await wait(2000);
    
    // Phase 3: Winner celebration (4s)
    setCurrentPhase(3);
    triggerConfetti();
    await wait(10000);
    
    setRevealState('complete');
  };

  const triggerConfetti = () => {
    const duration = 10000;
    const end = Date.now() + duration;

    const colors = ['#23dbf3', '#ee1147', '#ffffff'];

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
        <ParticleField active={revealState === 'revealing'} />
        <SpotlightEffect active={revealState === 'revealing'} />
      </div>

      <AnimatePresence mode="wait">
        {revealState === 'waiting' && (
          <RevealControlPanel
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
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
            onReset={() => setRevealState('waiting')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Control Panel Component
const RevealControlPanel = ({ selectedDay, onDayChange, onStartReveal }: any) => {
  return (
    <div className="min-h-screen bg-gradient-glow">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardHeader className="text-center">
              <CardTitle className="text-6xl md:text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-4">
                REVEAL DO DIA
              </CardTitle>
              <p className="text-xl md:text-2xl text-muted-foreground mb-2">Acampamento 25+</p>
              <div className="text-sm text-muted-foreground mt-2">
                "Sede, pois, imitadores de Deus, como filhos amados" - Efésios 5:1
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-foreground text-lg mb-3 block font-semibold">
                  Selecionar Dia do Camp
                </label>
                <Select value={selectedDay} onValueChange={onDayChange}>
                  <SelectTrigger className="w-full bg-card/50 border-border text-foreground text-lg py-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-09-12">Sexta-feira - 12 Set</SelectItem>
                    <SelectItem value="2024-09-13">Sábado - 13 Set</SelectItem>
                    <SelectItem value="2024-09-14">Domingo - 14 Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-team-yellow/20 border-team-yellow/50">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="text-team-yellow text-xl">⚠️</div>
                  <div>
                    <p className="text-team-yellow font-semibold mb-1">Atenção!</p>
                    <p className="text-muted-foreground text-sm">
                      Após iniciar o reveal, o dia será travado e não poderá receber mais pontos. 
                      Certifique-se que todos os pontos foram adicionados corretamente.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={onStartReveal}
                className="w-full py-6 text-2xl font-black rounded-xl
                         bg-gradient-camp hover:opacity-90
                         transform hover:scale-105 active:scale-95 transition-all
                         shadow-elevation"
              >
                <Sparkles className="w-8 h-8 mr-3" />
                INICIAR APURAÇÃO
                <Sparkles className="w-8 h-8 ml-3" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

// Locking Animation Component
const LockingAnimation = () => {
  return (
    <div className="min-h-screen bg-gradient-glow">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 mx-auto mb-8 rounded-full border-8 border-camp-cyan border-t-camp-pink shadow-camp"
          ></motion.div>
          <h2 className="text-4xl font-black text-foreground mb-4">
            APURANDO...
          </h2>
          <p className="text-muted-foreground text-xl">
            Preparando o reveal espetacular
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// Reveal Spectacle Component
const RevealSpectacle = ({ snapshot, phase }: any) => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center"
        >
          {/* Phase 1: All Teams Count Up */}
          {phase >= 1 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl mx-auto"
            >
              {snapshot.teams.map((team: any, index: number) => (
                <TeamRevealCard
                  key={team.id}
                  team={team}
                  rank={index + 1}
                  highlighted={phase >= 2 && index < 3}
                  delay={index * 0.2}
                />
              ))}
            </motion.div>
          )}

      {/* Phase 2: Top 3 Spotlight */}
      {phase >= 2 && (
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
const TeamRevealCard = ({ team, rank, highlighted, delay }: any) => {
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
    >
      <Card 
        className={`
          relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-elevation
          ${highlighted ? 'animate-leader-glow' : ''}
          bg-gradient-to-br from-card via-card to-card/50
          border-2 border-border hover:border-${teamColorClass}
        `}
        style={{
          '--leader-color': highlighted ? team.color : 'transparent'
        } as React.CSSProperties}
      >
        {/* Rank Badge */}
        <div className="absolute top-4 right-4">
          <Badge variant={rank === 1 ? "default" : "secondary"} className="text-lg font-bold px-3 py-1">
            {rank === 1 && <Trophy className="w-4 h-4 mr-1" />}
            #{rank}
          </Badge>
        </div>

        {/* Special Icons for Top 3 */}
        {rank <= 3 && (
          <div className="absolute top-4 left-4">
            {rank === 1 && <Crown className="w-8 h-8 text-team-yellow animate-bounce" />}
            {rank === 2 && <Trophy className="w-8 h-8 text-muted-foreground animate-bounce" />}
            {rank === 3 && <Star className="w-8 h-8 text-team-orange animate-bounce" />}
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-current" style={{ borderColor: team.color }}>
              <AvatarImage src={team.avatar_url} alt={`${team.name} team avatar`} />
              <AvatarFallback className={`bg-${teamColorClass} text-white font-bold text-xl`}>
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
              <TrendingUp className={`w-6 h-6 text-${teamColorClass}`} />
              <span className="text-lg font-semibold text-muted-foreground">Total Points</span>
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.5, type: "spring" }}
              className="text-6xl font-black" 
              style={{ color: team.color }}
            >
              <AnimatedCounter target={team.total_points} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Top 3 Spotlight Component
const Top3Spotlight = ({ teams }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-gradient-dark/90 backdrop-blur-sm flex items-center justify-center z-20"
    >
      <div className="text-center">
        <motion.h2
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="text-6xl font-black bg-gradient-camp bg-clip-text text-transparent mb-12"
        >
          TOP 3 DO DIA! 🏆
        </motion.h2>
        
        <div className="flex justify-center items-end gap-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Card className="bg-muted text-foreground w-24 h-32 rounded-t-lg flex items-center justify-center text-3xl font-black mb-4 shadow-elevation">
              2
            </Card>
            <h3 className="text-2xl font-bold text-foreground mb-2" style={{ color: teams[1]?.color }}>
              {teams[1]?.name}
            </h3>
            <p className="text-xl text-muted-foreground">{teams[1]?.total_points} pts</p>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <Card className="bg-team-yellow text-black w-32 h-40 rounded-t-lg flex items-center justify-center text-4xl font-black mb-4 shadow-camp">
              1
            </Card>
            <Crown className="w-12 h-12 text-team-yellow mx-auto mb-2 animate-bounce" />
            <h3 className="text-3xl font-black text-foreground mb-2" style={{ color: teams[0]?.color }}>
              {teams[0]?.name}
            </h3>
            <p className="text-2xl text-team-yellow font-bold">{teams[0]?.total_points} pts</p>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <Card className="bg-team-orange text-white w-20 h-24 rounded-t-lg flex items-center justify-center text-2xl font-black mb-4 shadow-elevation">
              3
            </Card>
            <h3 className="text-xl font-bold text-foreground mb-2" style={{ color: teams[2]?.color }}>
              {teams[2]?.name}
            </h3>
            <p className="text-lg text-muted-foreground">{teams[2]?.total_points} pts</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Winner Celebration Component
const WinnerCelebration = ({ winner }: any) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 1 }}
      className="fixed inset-0 bg-gradient-dark/95 backdrop-blur flex items-center justify-center z-30"
    >
      <div className="text-center">
        <motion.h1
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-8 drop-shadow-2xl"
        >
          🏆 CAMPEÃO DO DIA! 🏆
        </motion.h1>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card 
            className="bg-card/95 backdrop-blur-sm rounded-3xl p-12 shadow-elevation max-w-2xl mx-auto border-4"
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
            
            <h2 className="text-6xl font-black mb-6" style={{ color: winner.color }}>
              {winner.name}
            </h2>
            <div className="text-5xl font-bold text-foreground mb-4">
              {winner.total_points} pontos
            </div>
            
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Crown className="w-16 h-16 text-team-yellow mx-auto" />
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Reveal Complete Component
const RevealComplete = ({ snapshot, onReset }: any) => {
  return (
    <div className="min-h-screen bg-gradient-glow">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center w-full max-w-2xl"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardContent className="text-center space-y-8 p-8">
              <h1 className="text-6xl font-black bg-gradient-camp bg-clip-text text-transparent mb-8">
                Reveal Completo! ✨
              </h1>
              
              <div className="space-y-4">
                <Button
                  onClick={onReset}
                  className="px-8 py-4 text-xl font-bold rounded-xl
                           bg-gradient-camp hover:opacity-90
                           transform hover:scale-105 active:scale-95 transition-all"
                >
                  Fazer Novo Reveal
                </Button>
                
                <div className="text-muted-foreground">
                  <p>Parabéns ao time {snapshot.teams[0].name}!</p>
                  <p className="text-sm mt-2">"Follow God's example, therefore, as dearly loved children" - Ephesians 5:1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
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
          className="absolute w-2 h-2 bg-camp-cyan rounded-full"
          style={{
            backgroundColor: Math.random() > 0.5 ? '#23dbf3' : '#ee1147'
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
      className="absolute inset-0 bg-gradient-radial from-transparent via-camp-cyan/20 to-camp-pink/20"
    />
  );
};

// Animated Counter Component
const AnimatedCounter = ({ target }: { target: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    const stepTime = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{count}</span>;
};

export default DayReveal;