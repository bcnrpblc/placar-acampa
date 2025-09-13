import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Sparkles, Crown, ArrowLeft, TrendingUp, Gamepad2, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import * as React from "react";

const GameReveal = () => {
  const [revealState, setRevealState] = useState<'selecting' | 'locking' | 'revealing' | 'complete'>('selecting');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [games, setGames] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const navigate = useNavigate();

  // Load available games on component mount
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, title')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setGames(data);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const handleStartReveal = async () => {
    if (!selectedGame) return;
    
    setRevealState('locking');
    
    try {
      // Get the selected game details
      const selectedGameData = games.find(g => g.id === selectedGame);
      
      // Fetch game-specific scores using the view
      const { data: gameScores, error } = await supabase
        .from('game_team_scores')
        .select('*')
        .eq('game_id', selectedGame)
        .order('total_points', { ascending: false });

      if (error) throw error;

      if (gameScores && gameScores.length > 0) {
        const formattedSnapshot = {
          game_id: selectedGame,
          game_title: selectedGameData?.title || gameScores[0].game_title,
          teams: gameScores.map((score: any, index: number) => ({
            id: score.team_id,
            name: score.team_name,
            color: score.team_color,
            avatar_url: score.team_avatar,
            total_points: score.total_points,
            rank: index + 1
          }))
        };
        
        setSnapshot(formattedSnapshot);
        
        // Wait 2 seconds then start reveal
        setTimeout(() => {
          setRevealState('revealing');
          runRevealSequence();
        }, 2000);
      } else {
        // No scores found for this game
        alert('Nenhuma pontuação encontrada para este jogo.');
        setRevealState('selecting');
      }
    } catch (error) {
      console.error('Error creating game snapshot:', error);
      setRevealState('selecting');
    }
  };

  const runRevealSequence = async () => {
    // Phase 1: Time-based counting (10s)
    setCurrentPhase(1);
    await wait(10000);
    
    // HEARTBEAT TRANSITION (4.5 seconds)
    setCurrentPhase(1.5);
    await wait(4500);
    
    // Phase 2: Direct Top 3 spotlight (5s)
    setCurrentPhase(2);
    await wait(5000);
    
    // Phase 3: Extended winner celebration (60s)
    setCurrentPhase(3);
    triggerConfetti();
    await wait(60000);
    
    setRevealState('complete');
  };

  const triggerConfetti = () => {
    const duration = 60000; // 60 seconds
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

  const handleReset = () => {
    setRevealState('selecting');
    setSelectedGame('');
    setSnapshot(null);
    setCurrentPhase(1);
  };

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
        {revealState === 'selecting' && (
          <GameSelectionPanel
            games={games}
            selectedGame={selectedGame}
            onGameChange={setSelectedGame}
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
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Game Selection Panel Component
const GameSelectionPanel = ({ games, selectedGame, onGameChange, onStartReveal }: any) => {
  return (
    <div className="min-h-screen bg-gradient-glow">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-4xl"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Gamepad2 className="w-16 h-16 text-camp-cyan" />
              </div>
              <CardTitle className="text-6xl md:text-9xl font-black bg-gradient-camp bg-clip-text text-transparent mb-4">
                APURAÇÃO POR JOGO
              </CardTitle>
              <p className="text-xl md:text-2xl text-muted-foreground mb-2">Acampamento 25+</p>
              <div className="text-xl text-muted-foreground mt-2">
                "Sede, pois, imitadores de Deus, como filhos amados" - Efésios 5:1
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-foreground text-lg mb-3 block font-semibold">
                  Selecione o Jogo
                </label>
                <div className="relative">
                  <select
                    value={selectedGame}
                    onChange={(e) => onGameChange(e.target.value)}
                    className="w-full bg-card/50 border border-border text-foreground text-lg py-3 px-4 rounded-md appearance-none cursor-pointer
                             hover:bg-card/70 transition-colors focus:outline-none focus:ring-2 focus:ring-camp-cyan"
                  >
                    <option value="">-- Escolha um jogo --</option>
                    {games.map((game: any) => (
                      <option key={game.id} value={game.id}>
                        {game.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {selectedGame && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-camp-cyan/10 border-camp-cyan/30">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Trophy className="w-6 h-6 text-camp-cyan" />
                      <div>
                        <p className="text-camp-cyan font-semibold">
                          Jogo selecionado: {games.find(g => g.id === selectedGame)?.title}
                        </p>
                        <p className="text-muted-foreground text-sm mt-1">
                          Pronto para revelar os vencedores!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <Button
                onClick={onStartReveal}
                disabled={!selectedGame}
                className="w-full py-6 text-4xl font-black rounded-xl
                         bg-gradient-camp hover:opacity-90
                         transform hover:scale-105 active:scale-95 transition-all
                         shadow-elevation disabled:opacity-50 disabled:cursor-not-allowed
                         disabled:transform-none"
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
            CALCULANDO PONTUAÇÃO...
          </h2>
          <p className="text-muted-foreground text-xl">
            Preparando o resultado do jogo...
          </p>
        </motion.div>
      </div>
    </div>
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
      <div className="relative">
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: 10,
            ease: "easeInOut",
          }}
          className="absolute inset-0 w-64 h-64 -translate-x-32 -translate-y-32 
                     rounded-full bg-camp-cyan/30 blur-xl"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.1, 0.5],
          }}
          transition={{
            duration: 5,
            repeat: 2,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute inset-0 w-48 h-48 -translate-x-24 -translate-y-24 
                     rounded-full bg-camp-cyan/50 blur-lg"
        />
        
        <motion.div
          animate={{
            scale: [3, 3.2, 0.9, 3],
            boxShadow: [
              "0 0 0 0 rgba(35, 219, 243, 0.7)",
              "0 0 0 40px rgba(35, 219, 243, 0)",
              "0 0 0 0 rgba(35, 219, 243, 0)",
              "0 0 0 0 rgba(35, 219, 243, 0.7)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: 5,
            ease: "easeInOut",
          }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-camp-cyan to-camp-pink 
                     shadow-2xl shadow-camp-cyan/50"
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-32 text-center"
      >
        <p className="text-camp-cyan text-2xl font-bold animate-pulse">
          Preparando o Top 3...
        </p>
      </motion.div>
    </motion.div>
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
          {/* Phase 1: All Teams Mystery Count Up */}
          {phase === 1 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4"
            >
              {(() => {
                const teamsToShow = [...snapshot.teams]
                  .sort(() => Math.random() - 0.5);
                
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

          {phase >= 2 && phase < 3 && (
            <Top3Spotlight teams={snapshot.teams.slice(0, 3)} />
          )}

          {/* Phase 3: Winner Celebration with Game Title */}
          {phase >= 3 && (
            <WinnerCelebration winner={snapshot.teams[0]} gameTitle={snapshot.game_title} />
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
        {!hideRanking && (
          <div className="absolute top-4 right-4">
            <Badge variant={rank === 1 ? "default" : "secondary"} className="text-lg font-bold px-3 py-1">
              {rank === 1 && <Trophy className="w-4 h-4 mr-1" />}
              #{rank}
            </Badge>
          </div>
        )}

        {!hideRanking && rank <= 3 && (
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
              <span className="text-lg font-semibold text-muted-foreground">Pontos no Jogo</span>
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.5, type: "spring" }}
              className="relative"
            >
              <div 
                className={`text-6xl font-black ${phase === 1 ? 'font-mono' : ''}`}
                style={{ color: team.color }}
              >
                {phase === 1 && (
                  <div className="text-sm text-muted-foreground mb-2">
                    CALCULANDO...
                  </div>
                )}
                <AnimatedCounter 
                  target={team.total_points} 
                  phase={phase}
                  hideActualScore={phase === 1}
                />
                {phase === 1 && (
                  <div className="text-lg mt-2">
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

// Top 3 Spotlight Component
const Top3Spotlight = ({ teams }: any) => {
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
      className="fixed inset-0 bg-gradient-dark/90 backdrop-blur-sm z-20 overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center scale-[1.2] transform-gpu">
          <motion.h2
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="text-4xl md:text-6xl font-black bg-gradient-camp bg-clip-text text-transparent mb-16 md:mb-20 text-center whitespace-nowrap"
          >
            TOP 3 DO JOGO! 🏆
          </motion.h2>
          
          <div className="flex justify-center items-end gap-4 md:gap-8">
            {/* 2nd Place */}
            {teams[1] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
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
                <div className="text-2xl md:text-3xl font-black text-muted-foreground mb-4">2</div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2" style={{ color: teams[1]?.color }}>
                  {teams[1]?.name}
                </h3>
                <p className="text-lg md:text-xl text-muted-foreground">{teams[1]?.total_points} pts</p>
              </motion.div>
            )}

            {/* 1st Place */}
            {teams[0] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center"
              >
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
                <div className="text-3xl md:text-4xl font-black text-team-yellow mb-2">1</div>
                <Crown className="w-10 md:w-12 h-10 md:h-12 text-team-yellow mx-auto mb-2 animate-bounce" />
                <h3 className="text-2xl md:text-3xl font-black text-foreground mb-2" style={{ color: teams[0]?.color }}>
                  {teams[0]?.name}
                </h3>
                <p className="text-xl md:text-2xl text-team-yellow font-bold">{teams[0]?.total_points} pts</p>
              </motion.div>
            )}

            {/* 3rd Place */}
            {teams[2] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center"
              >
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
                <div className="text-xl md:text-2xl font-black text-team-orange mb-4">3</div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2" style={{ color: teams[2]?.color }}>
                  {teams[2]?.name}
                </h3>
                <p className="text-base md:text-lg text-muted-foreground">{teams[2]?.total_points} pts</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Winner Celebration Component - NOW WITH GAME TITLE
const WinnerCelebration = ({ winner, gameTitle }: any) => {
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
          className="text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-4 drop-shadow-2xl"
        >
          🏆 EQUIPE CAMPEÃ! 🏆
        </motion.h1>
        
        {/* Game Title Display */}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-muted-foreground mb-8"
        >
          Vencedor de: <span className="text-camp-cyan">{gameTitle}</span>
        </motion.h2>
        
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
              <h1 className="text-6xl font-black bg-gradient-camp bg-clip-text text-transparent mb-4">
                Apuração Completa! ✨
              </h1>
              
              <div className="space-y-2 mb-6">
                <p className="text-2xl text-muted-foreground">
                  Jogo: <span className="text-camp-cyan font-bold">{snapshot.game_title}</span>
                </p>
                <p className="text-xl">
                  Parabéns à equipe <span style={{ color: snapshot.teams[0].color }} className="font-bold">{snapshot.teams[0].name}</span>!
                </p>
              </div>
              
              <div className="space-y-4">
                <Button
                  onClick={onReset}
                  className="px-8 py-4 text-xl font-bold rounded-xl
                           bg-gradient-camp hover:opacity-90
                           transform hover:scale-105 active:scale-95 transition-all"
                >
                  <Gamepad2 className="w-6 h-6 mr-2" />
                  Revelar Outro Jogo
                </Button>
                
                <div className="text-muted-foreground">
                  <p className="text-sm mt-4">"Sede, pois, imitadores de Deus, como filhos amados" - Efésios 5:1</p>
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
const AnimatedCounter = ({ target, phase = 1, hideActualScore = false }: { target: number, phase?: number, hideActualScore?: boolean }) => {
  const [display, setDisplay] = useState<string | number>(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (hideActualScore) {
      // Phase 1: Slot machine effect
      setIsSpinning(true);
      const duration = 10000; // 10 seconds
      let elapsed = 0;
      let changeSpeed = 50;
      
      const timer = setInterval(() => {
        elapsed += changeSpeed;
        
        if (elapsed >= duration) {
          setDisplay("???");
          setIsSpinning(false);
          clearInterval(timer);
          return;
        }
        
        const progress = elapsed / duration;
        changeSpeed = 50 + (progress * 150);
        
        const updateChance = 1 - (progress * 0.8);
        
        if (Math.random() < updateChance) {
          const minScore = 10;
          const maxScore = 200; // Lower for individual games
          const fakeScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
          setDisplay(fakeScore);
        }
      }, changeSpeed);

      return () => clearInterval(timer);
    } else {
      // Phase 2+: Show actual score
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

export default GameReveal;