import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TeamResult {
  id: string;
  name: string;
  color: string;
  total_points: number;
  rank: number;
}

const DayReveal = () => {
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color');

      const { data: aggregatesData, error: aggregatesError } = await supabase
        .from('team_aggregates')
        .select('team_id, total_points');

      if (teamsError || aggregatesError) throw teamsError || aggregatesError;

      const teamsWithPoints = (teamsData || []).map(team => {
        const aggregate = aggregatesData?.find(a => a.team_id === team.id);
        return {
          ...team,
          total_points: aggregate?.total_points || 0
        };
      });

      const sortedTeams = teamsWithPoints
        .sort((a, b) => a.total_points - b.total_points) // Start with lowest for dramatic reveal
        .map((team, index) => ({ ...team, rank: teamsWithPoints.length - index }));

      setTeams(sortedTeams);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const startReveal = () => {
    setIsRevealing(true);
    setCurrentRevealIndex(0);
    setShowFinalResults(false);
  };

  const revealNext = () => {
    if (currentRevealIndex < teams.length - 1) {
      setCurrentRevealIndex(currentRevealIndex + 1);
    } else {
      // Show final results with winner
      setShowFinalResults(true);
    }
  };

  const resetReveal = () => {
    setIsRevealing(false);
    setCurrentRevealIndex(-1);
    setShowFinalResults(false);
  };

  const currentTeam = teams[currentRevealIndex];
  const winner = teams[teams.length - 1]; // Last in sorted array (highest points)

  return (
    <div className="min-h-screen bg-gradient-dark p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 text-camp-pink opacity-20 text-9xl animate-pulse">★</div>
        <div className="absolute bottom-40 left-20 text-camp-pink opacity-15 text-6xl animate-bounce">➤</div>
        <div className="absolute top-1/2 right-10 text-camp-pink opacity-20 text-7xl animate-pulse">★</div>
        <div className="absolute bottom-20 right-1/3 text-camp-pink opacity-10 text-5xl animate-bounce">➤</div>
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="bg-card/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-camp bg-clip-text text-transparent">
              DAY REVEAL
            </h1>
            <p className="text-muted-foreground">End of Day Ceremony</p>
          </div>

          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {!isRevealing && !showFinalResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <div className="mb-6">
                  <Sparkles className="w-16 h-16 text-camp-cyan mx-auto mb-4 animate-pulse" />
                  <h2 className="text-2xl font-bold mb-4">Ready for Today's Results?</h2>
                  <p className="text-muted-foreground">
                    Time to reveal the day's winners with dramatic flair! 
                    Teams will be revealed from lowest to highest points.
                  </p>
                </div>
                
                <Button
                  onClick={startReveal}
                  size="lg"
                  className="bg-gradient-camp text-camp-dark hover:scale-105 transition-transform"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Start Day Reveal!
                </Button>
              </CardContent>
            </Card>

            {/* Teams Preview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {teams.slice().reverse().map((team, index) => (
                <Card key={team.id} className="bg-card/30 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <div 
                      className="w-8 h-8 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: team.color }}
                    />
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-camp-cyan font-bold">{team.total_points} pts</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Revealing Animation */}
        <AnimatePresence>
          {isRevealing && currentTeam && !showFinalResults && (
            <motion.div
              key={currentRevealIndex}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-center"
            >
              <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20 max-w-2xl mx-auto">
                <CardContent className="p-12">
                  <Badge variant="outline" className="mb-4 text-lg px-4 py-2">
                    Position #{currentTeam.rank}
                  </Badge>
                  
                  <div 
                    className="w-24 h-24 rounded-full mx-auto mb-6 animate-pulse"
                    style={{ backgroundColor: currentTeam.color }}
                  />
                  
                  <h2 className="text-4xl font-black mb-4" style={{ color: currentTeam.color }}>
                    {currentTeam.name}
                  </h2>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-6xl font-black text-camp-cyan mb-6"
                  >
                    {currentTeam.total_points}
                  </motion.div>
                  
                  <p className="text-xl text-muted-foreground mb-8">Total Points</p>
                  
                  <Button
                    onClick={revealNext}
                    size="lg"
                    className="bg-camp-pink text-white hover:bg-camp-pink/90"
                  >
                    {currentRevealIndex < teams.length - 1 ? "Next Team" : "Show Winner!"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final Results with Winner */}
        <AnimatePresence>
          {showFinalResults && winner && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {/* Confetti Effect */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -100, x: Math.random() * window.innerWidth, opacity: 1 }}
                    animate={{ 
                      y: window.innerHeight + 100, 
                      rotate: 360,
                      opacity: 0 
                    }}
                    transition={{ 
                      duration: 3,
                      delay: Math.random() * 2,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 3
                    }}
                    className="absolute w-4 h-4 bg-camp-cyan"
                    style={{
                      backgroundColor: Math.random() > 0.5 ? '#23dbf3' : '#ee1147'
                    }}
                  />
                ))}
              </div>

              <Card className="bg-gradient-camp text-camp-dark max-w-3xl mx-auto">
                <CardContent className="p-12">
                  <Crown className="w-20 h-20 mx-auto mb-6 animate-bounce" />
                  
                  <h2 className="text-2xl font-bold mb-2">🎉 DAY WINNER 🎉</h2>
                  
                  <h3 className="text-6xl font-black mb-4">{winner.name}</h3>
                  
                  <div className="text-8xl font-black mb-6">
                    {winner.total_points}
                  </div>
                  
                  <p className="text-xl mb-8">Total Points Today</p>
                  
                  <div className="space-y-4">
                    <Button
                      onClick={resetReveal}
                      size="lg"
                      variant="outline"
                      className="bg-white/20 text-camp-dark border-camp-dark hover:bg-white/30"
                    >
                      Replay Reveal
                    </Button>
                    
                    <div className="text-sm opacity-80">
                      Great job everyone! 🏆
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DayReveal;