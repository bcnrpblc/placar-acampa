import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Crown, Star } from "lucide-react";

interface TeamSnapshot {
  team_id: string;
  name: string;
  color?: string;
  avatar_url?: string;
  day_points: number;
  total_points_after_day: number;
  top_players: Array<{
    name: string;
    points: number;
  }>;
}

interface DaySnapshot {
  day: string;
  ordered_teams: TeamSnapshot[];
  created_at: string;
}

interface DayRevealSpectacleProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: DaySnapshot | null;
}

type RevealPhase = 'locking' | 'counting' | 'highlighting' | 'winner' | 'complete';

export const DayRevealSpectacle = ({ isOpen, onClose, snapshot }: DayRevealSpectacleProps) => {
  const [phase, setPhase] = useState<RevealPhase>('locking');
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [animatedCounts, setAnimatedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen || !snapshot) return;

    const runRevealSequence = async () => {
      // Phase 1: Locking (2s)
      setPhase('locking');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Phase 2: Count-up all teams simultaneously (3s)
      setPhase('counting');
      
      // Initialize animated counts
      const initialCounts: Record<string, number> = {};
      snapshot.ordered_teams.forEach(team => {
        initialCounts[team.team_id] = 0;
      });
      setAnimatedCounts(initialCounts);

      // Animate all teams counting up
      const countDuration = 3000;
      const frameRate = 60;
      const totalFrames = (countDuration / 1000) * frameRate;
      
      for (let frame = 0; frame <= totalFrames; frame++) {
        await new Promise(resolve => setTimeout(resolve, 1000 / frameRate));
        const progress = frame / totalFrames;
        const easing = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        const newCounts: Record<string, number> = {};
        snapshot.ordered_teams.forEach(team => {
          newCounts[team.team_id] = Math.round(team.day_points * easing);
        });
        setAnimatedCounts(newCounts);
      }

      await new Promise(resolve => setTimeout(resolve, 800)); // Pause after count-up

      // Phase 3: Highlight top 3 (2s each)
      setPhase('highlighting');
      const topThree = snapshot.ordered_teams.slice(0, 3);
      
      for (let i = topThree.length - 1; i >= 0; i--) {
        setCurrentTeamIndex(i);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Phase 4: Spotlight winner (4s)
      setPhase('winner');
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Phase 5: Complete
      setPhase('complete');
    };

    runRevealSequence();
  }, [isOpen, snapshot]);

  const getTeamColorClass = (teamName: string) => {
    const colorMap: Record<string, string> = {
      'Blue': 'from-blue-500 to-blue-600 text-white',
      'Red': 'from-red-500 to-red-600 text-white',
      'Green': 'from-green-500 to-green-600 text-white',
      'Yellow': 'from-yellow-400 to-yellow-500 text-black',
      'Purple': 'from-purple-500 to-purple-600 text-white',
      'Orange': 'from-orange-500 to-orange-600 text-white',
      'Pink': 'from-pink-500 to-pink-600 text-white',
      'Black': 'from-gray-800 to-gray-900 text-white',
      'Grey': 'from-gray-500 to-gray-600 text-white',
      'Brown': 'from-amber-700 to-amber-800 text-white',
    };
    return colorMap[teamName] || 'from-gray-400 to-gray-500 text-white';
  };

  if (!snapshot) return null;

  const winner = snapshot.ordered_teams[0];
  const topThree = snapshot.ordered_teams.slice(0, 3);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-6xl h-[90vh] bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 border-0 overflow-hidden">
        <div className="flex flex-col h-full">
          
          {/* Locking Phase */}
          {phase === 'locking' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-camp-cyan border-t-transparent rounded-full mx-auto mb-6 animate-spin" />
                <h2 className="text-4xl font-bold text-white mb-2">Locking Day Scores</h2>
                <p className="text-xl text-gray-300">Calculating final totals...</p>
              </div>
            </div>
          )}

          {/* Counting Phase */}
          {phase === 'counting' && (
            <div className="p-8 animate-fade-in">
              <h2 className="text-4xl font-bold text-center text-white mb-8">
                Day {snapshot.day} Results
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {snapshot.ordered_teams.map((team, index) => (
                  <div key={team.team_id} className="animate-scale-in">
                    <Card className={`p-4 bg-gradient-to-br ${getTeamColorClass(team.name)} shadow-xl`}>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-2">{team.name}</h3>
                        <div className="text-3xl font-bold">
                          {animatedCounts[team.team_id] || 0}
                        </div>
                        <div className="text-sm opacity-80 mt-1">points today</div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlighting Phase */}
          {phase === 'highlighting' && (
            <div className="p-8 animate-fade-in">
              <h2 className="text-4xl font-bold text-center text-white mb-8">
                Top 3 Teams
              </h2>
              <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
                {topThree.map((team, index) => (
                  <div
                    key={team.team_id}
                    className={`transition-all duration-500 ${
                      index === currentTeamIndex ? 'scale-110 z-10' : 'scale-100 opacity-60'
                    }`}
                  >
                    <Card className={`p-6 bg-gradient-to-br ${getTeamColorClass(team.name)} shadow-2xl relative overflow-hidden`}>
                      {index === 0 && (
                        <Crown className="absolute top-2 right-2 w-8 h-8 text-yellow-300" />
                      )}
                      {index === 1 && (
                        <Trophy className="absolute top-2 right-2 w-6 h-6 text-gray-300" />
                      )}
                      {index === 2 && (
                        <Star className="absolute top-2 right-2 w-6 h-6 text-amber-600" />
                      )}
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-2">#{index + 1}</div>
                        <h3 className="font-bold text-xl mb-3">{team.name}</h3>
                        <div className="text-4xl font-bold mb-2">{team.total_points_after_day}</div>
                        <div className="text-sm opacity-80">total points</div>
                        <div className="text-lg font-semibold mt-2">
                          +{team.day_points} today
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Winner Phase */}
          {phase === 'winner' && (
            <div className="flex items-center justify-center h-full relative overflow-hidden animate-fade-in">
              <div className="text-center z-10 animate-scale-in">
                <div className="mb-6 animate-pulse">
                  <Crown className="w-24 h-24 text-yellow-400 mx-auto" />
                </div>
                
                <h1 className="text-6xl font-bold text-white mb-4">
                  DAY WINNER!
                </h1>
                
                <Card className={`p-12 bg-gradient-to-br ${getTeamColorClass(winner.name)} shadow-2xl max-w-md mx-auto`}>
                  <h2 className="text-5xl font-bold mb-6">{winner.name}</h2>
                  <div className="text-6xl font-bold mb-4">{winner.total_points_after_day}</div>
                  <div className="text-2xl opacity-90">Total Points</div>
                  <div className="text-2xl font-semibold mt-4">
                    +{winner.day_points} points today
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Complete Phase */}
          {phase === 'complete' && (
            <div className="p-8 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Day {snapshot.day} Complete!
                </h2>
                <Button 
                  onClick={onClose}
                  size="lg"
                  className="bg-camp-cyan hover:bg-camp-cyan/80 text-black font-bold"
                >
                  Continue to Live Leaderboard
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {snapshot.ordered_teams.map((team, index) => (
                  <Card key={team.team_id} className={`p-4 bg-gradient-to-br ${getTeamColorClass(team.name)} shadow-xl`}>
                    <div className="text-center">
                      <div className="text-lg font-bold">#{index + 1}</div>
                      <h3 className="font-bold text-lg mb-2">{team.name}</h3>
                      <div className="text-2xl font-bold">{team.total_points_after_day}</div>
                      <div className="text-sm opacity-80">total points</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};