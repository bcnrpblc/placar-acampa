import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Sparkles, Crown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

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
        }, 2000);
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
    await wait(6000);
    
    // Phase 3: Winner celebration (4s)
    setCurrentPhase(3);
    triggerConfetti();
    await wait(4000);
    
    setRevealState('complete');
  };

  const triggerConfetti = () => {
    const duration = 3000;
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          size="sm"
          className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center justify-center min-h-screen p-8"
    >
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-6xl font-black text-white mb-4">
            <span className="bg-gradient-to-r from-camp-cyan to-camp-pink bg-clip-text text-transparent">
              REVEAL DO DIA
            </span>
          </CardTitle>
          <p className="text-white/80 text-xl">Acampamento 25+</p>
          <p className="text-white/60 text-sm mt-2">
            "Therefore be imitators of God, as beloved children" - Ephesians 5:1
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-white text-lg mb-3 block font-semibold">
              Selecionar Dia do Camp
            </label>
            <Select value={selectedDay} onValueChange={onDayChange}>
              <SelectTrigger className="w-full bg-white/20 border-white/30 text-white text-lg py-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-09-12">Sexta-feira - 12 Set</SelectItem>
                <SelectItem value="2024-09-13">Sábado - 13 Set</SelectItem>
                <SelectItem value="2024-09-14">Domingo - 14 Set</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 text-xl">⚠️</div>
              <div>
                <p className="text-yellow-300 font-semibold mb-1">Atenção!</p>
                <p className="text-yellow-200 text-sm">
                  Após iniciar o reveal, o dia será travado e não poderá receber mais pontos. 
                  Certifique-se que todos os pontos foram adicionados corretamente.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={onStartReveal}
            className="w-full py-6 text-2xl font-black rounded-xl
                     bg-gradient-to-r from-camp-pink to-camp-cyan
                     hover:from-camp-pink/80 hover:to-camp-cyan/80
                     transform hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-8 h-8 mr-3" />
            INICIAR REVEAL ESPETACULAR
            <Sparkles className="w-8 h-8 ml-3" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Locking Animation Component
const LockingAnimation = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center min-h-screen"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 mx-auto mb-8 rounded-full border-8 border-camp-cyan border-t-camp-pink"
        ></motion.div>
        <h2 className="text-4xl font-black text-white mb-4">
          TRAVANDO O DIA...
        </h2>
        <p className="text-white/80 text-xl">
          Preparando o reveal espetacular
        </p>
      </div>
    </motion.div>
  );
};

// Reveal Spectacle Component
const RevealSpectacle = ({ snapshot, phase }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-8"
    >
      {/* Phase 1: All Teams Count Up */}
      {phase >= 1 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid grid-cols-2 gap-8 max-w-6xl mx-auto"
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
  );
};

// Team Reveal Card Component
const TeamRevealCard = ({ team, rank, highlighted, delay }: any) => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.6 }}
      className={`
        relative rounded-2xl p-6 backdrop-blur-md border-4 transition-all duration-500
        ${highlighted 
          ? 'bg-white/95 shadow-2xl ring-4 ring-yellow-400 scale-110 z-10' 
          : 'bg-white/80 shadow-xl'
        }
      `}
      style={{ borderColor: team.color }}
    >
      {/* Rank Badge */}
      <div className={`absolute -top-3 -left-3 w-12 h-12 rounded-full
                    flex items-center justify-center font-black text-xl
                    ${rank === 1 
                      ? 'bg-yellow-400 text-black shadow-lg' 
                      : rank === 2
                      ? 'bg-gray-400 text-white'
                      : rank === 3
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-800 text-white'
                    }`}>
        {rank}
      </div>

      {/* Special Icons for Top 3 */}
      {rank <= 3 && (
        <div className="absolute -top-6 right-4">
          {rank === 1 && <Crown className="w-8 h-8 text-yellow-400 animate-bounce" />}
          {rank === 2 && <Trophy className="w-8 h-8 text-gray-400 animate-bounce" />}
          {rank === 3 && <Star className="w-8 h-8 text-amber-600 animate-bounce" />}
        </div>
      )}

      {/* Team Info */}
      <div className="flex items-center gap-4">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg"
          style={{ backgroundColor: team.color }}
        >
          {team.avatar_url ? (
            <img src={team.avatar_url} alt={team.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            team.name.charAt(0)
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-2xl font-black mb-1" style={{ color: team.color }}>
            {team.name}
          </h3>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.5, type: "spring" }}
            className="text-4xl font-black text-gray-800"
          >
            <AnimatedCounter target={team.total_points} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Top 3 Spotlight Component
const Top3Spotlight = ({ teams }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
    >
      <div className="text-center">
        <motion.h2
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="text-6xl font-black text-white mb-12"
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
            <div className="bg-gray-400 text-white w-24 h-32 rounded-t-lg flex items-center justify-center text-3xl font-black mb-4">
              2
            </div>
            <h3 className="text-2xl font-bold text-white" style={{ color: teams[1]?.color }}>
              {teams[1]?.name}
            </h3>
            <p className="text-xl text-gray-300">{teams[1]?.total_points} pts</p>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <div className="bg-yellow-400 text-black w-32 h-40 rounded-t-lg flex items-center justify-center text-4xl font-black mb-4 shadow-2xl">
              1
            </div>
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2 animate-bounce" />
            <h3 className="text-3xl font-black text-white mb-2" style={{ color: teams[0]?.color }}>
              {teams[0]?.name}
            </h3>
            <p className="text-2xl text-yellow-400 font-bold">{teams[0]?.total_points} pts</p>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <div className="bg-amber-600 text-white w-20 h-24 rounded-t-lg flex items-center justify-center text-2xl font-black mb-4">
              3
            </div>
            <h3 className="text-xl font-bold text-white" style={{ color: teams[2]?.color }}>
              {teams[2]?.name}
            </h3>
            <p className="text-lg text-gray-300">{teams[2]?.total_points} pts</p>
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
      className="fixed inset-0 bg-black/90 backdrop-blur flex items-center justify-center z-30"
    >
      <div className="text-center">
        <motion.h1
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-8xl font-black text-white mb-8 drop-shadow-2xl"
        >
          🏆 CAMPEÃO DO DIA! 🏆
        </motion.h1>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/95 rounded-3xl p-12 shadow-2xl max-w-2xl mx-auto"
          style={{ borderColor: winner.color, borderWidth: 8 }}
        >
          <div 
            className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-6xl font-black shadow-2xl"
            style={{ backgroundColor: winner.color }}
          >
            {winner.avatar_url ? (
              <img src={winner.avatar_url} alt={winner.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              winner.name.charAt(0)
            )}
          </div>
          
          <h2 className="text-6xl font-black mb-6" style={{ color: winner.color }}>
            {winner.name}
          </h2>
          <div className="text-5xl font-bold text-gray-800 mb-4">
            {winner.total_points} pontos
          </div>
          
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <Crown className="w-16 h-16 text-yellow-400 mx-auto" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Reveal Complete Component
const RevealComplete = ({ snapshot, onReset }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-8"
    >
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-black text-white mb-8">
          Reveal Completo! ✨
        </h1>
        
        <div className="space-y-4">
          <Button
            onClick={onReset}
            className="px-8 py-4 text-xl font-bold rounded-xl
                     bg-camp-cyan hover:bg-camp-cyan/80"
          >
            Fazer Novo Reveal
          </Button>
          
          <div className="text-white/60">
            <p>Parabéns ao time {snapshot.teams[0].name}!</p>
            <p className="text-sm mt-2">"Therefore be imitators of God, as beloved children" - Ephesians 5:1</p>
          </div>
        </div>
      </div>
    </motion.div>
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