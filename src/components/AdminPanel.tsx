import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Undo2, Trophy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Game {
  id: string;
  title: string;
  slug: string;
}

interface Player {
  id: string;
  name: string;
}

interface ScoreEntry {
  id: string;
  points: number;
  reason: string | null;
  created_at: string;
  team: { name: string; color: string };
  player: { name: string } | null;
}

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [recentEntries, setRecentEntries] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [assignmentMode, setAssignmentMode] = useState<'individual' | 'team'>('individual');
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedGame, setSelectedGame] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [teamPoints, setTeamPoints] = useState("");
  const [customDistribution, setCustomDistribution] = useState<{[playerId: string]: number}>({});
  
  const { toast } = useToast();

  // Fetch initial data
  useEffect(() => {
    fetchTeams();
    fetchGames();
    fetchRecentEntries();
  }, []);

  // Fetch players when team changes
  useEffect(() => {
    if (selectedTeam) {
      fetchPlayersForTeam(selectedTeam);
    } else {
      setPlayers([]);
      setSelectedPlayer("");
      setCustomDistribution({});
    }
  }, [selectedTeam]);

  // Reset custom distribution when team points change
  useEffect(() => {
    if (assignmentMode === 'team' && teamPoints && players.length > 0) {
      const evenSplit = Math.floor(parseInt(teamPoints) / players.length);
      const newDistribution: {[playerId: string]: number} = {};
      players.forEach(player => {
        newDistribution[player.id] = evenSplit;
      });
      setCustomDistribution(newDistribution);
    }
  }, [teamPoints, players, assignmentMode]);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('name');
    if (data) setTeams(data);
  };

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('title');
    if (data) setGames(data);
  };

  const fetchPlayersForTeam = async (teamId: string) => {
    setPlayers([]);
    setSelectedPlayer("");
    if (!teamId) return;
    const { data } = await supabase
      .from('players')
      .select('id, name')
      .eq('team_id', teamId)
      .order('name');
    if (data) setPlayers(data as Player[]);
  };

  const fetchRecentEntries = async () => {
    const { data } = await supabase
      .from('score_entries')
      .select(`
        id,
        points,
        reason,
        created_at,
        team:teams(name, color),
        player:players(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setRecentEntries(data as ScoreEntry[]);
  };

  const addPoints = async () => {
    if (assignmentMode === 'individual') {
      if (!selectedTeam || !selectedPlayer || !points || !selectedGame) {
        toast({
          title: "Missing Information",
          description: "Please select team, participant, game, and enter points",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (!selectedTeam || !teamPoints || !selectedGame) {
        toast({
          title: "Missing Information",
          description: "Please select team, game, and enter team points",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    try {
      // First, create a round for this game
      const { data: roundData } = await supabase
        .from('rounds')
        .select('id')
        .eq('game_id', selectedGame)
        .eq('day', new Date().toISOString().split('T')[0])
        .single();

      let roundId = roundData?.id;
      
      if (!roundId) {
        const { data: newRound, error: roundError } = await supabase
          .from('rounds')
          .insert({
            game_id: selectedGame,
            day: new Date().toISOString().split('T')[0],
            round_number: 1
          })
          .select('id')
          .single();

        if (roundError) throw roundError;
        roundId = newRound.id;
      }

      if (assignmentMode === 'individual') {
        // Individual mode - existing logic
        const { error: scoreError } = await supabase
          .from('score_entries')
          .insert({
            round_id: roundId,
            team_id: selectedTeam,
            player_id: selectedPlayer,
            points: parseInt(points),
            reason: reason || null
          });

        if (scoreError) throw scoreError;

        // Update team aggregate
        const { error: aggregateError } = await supabase
          .rpc('increment_team_points', {
            target_team_id: selectedTeam,
            points_to_add: parseInt(points)
          });

        if (aggregateError) {
          // Fallback: manual update
          const { data: currentAggregate } = await supabase
            .from('team_aggregates')
            .select('total_points')
            .eq('team_id', selectedTeam)
            .single();

          const newTotal = (currentAggregate?.total_points || 0) + parseInt(points);
          
          await supabase
            .from('team_aggregates')
            .update({ 
              total_points: newTotal,
              last_updated: new Date().toISOString()
            })
            .eq('team_id', selectedTeam);
        }

        toast({
          title: "Points Added!",
          description: `Added ${points} points to ${teams.find(t => t.id === selectedTeam)?.name}`,
        });
      } else {
        // Team mode - distribute points among all participants
        const scoreEntries = players.map(player => ({
          round_id: roundId,
          team_id: selectedTeam,
          player_id: player.id,
          points: customDistribution[player.id] || 0,
          reason: reason || `Team distribution: ${teamPoints} points`
        }));

        const { error: scoreError } = await supabase
          .from('score_entries')
          .insert(scoreEntries);

        if (scoreError) throw scoreError;

        // Update team aggregate with total team points
        const { error: aggregateError } = await supabase
          .rpc('increment_team_points', {
            target_team_id: selectedTeam,
            points_to_add: parseInt(teamPoints)
          });

        if (aggregateError) {
          // Fallback: manual update
          const { data: currentAggregate } = await supabase
            .from('team_aggregates')
            .select('total_points')
            .eq('team_id', selectedTeam)
            .single();

          const newTotal = (currentAggregate?.total_points || 0) + parseInt(teamPoints);
          
          await supabase
            .from('team_aggregates')
            .update({ 
              total_points: newTotal,
              last_updated: new Date().toISOString()
            })
            .eq('team_id', selectedTeam);
        }

        toast({
          title: "Team Points Distributed!",
          description: `Added ${teamPoints} points to ${teams.find(t => t.id === selectedTeam)?.name} across ${players.length} participants`,
        });
      }

      // Reset form
      setPoints("");
      setTeamPoints("");
      setReason("");
      setCustomDistribution({});
      fetchRecentEntries();

    } catch (error) {
      console.error('Error adding points:', error);
      toast({
        title: "Error",
        description: "Failed to add points. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-camp bg-clip-text text-transparent">
              Camp Clash Admin
            </h1>
            <p className="text-muted-foreground">Judge Panel • Add Points & Manage Scores</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add Points Form */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-camp-cyan" />
                Add Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assignment Mode Selection */}
              <div>
                <Label>Assign Points To</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={assignmentMode === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAssignmentMode('individual')}
                    className="flex-1"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Individual Participant
                  </Button>
                  <Button
                    variant={assignmentMode === 'team' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAssignmentMode('team')}
                    className="flex-1"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Entire Team
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="team-select">Select Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: team.color }}
                          />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Individual Mode Fields */}
              {assignmentMode === 'individual' && (
                <>
                  <div>
                    <Label htmlFor="player-select">Select Participant</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder={players.length ? "Choose a participant..." : "No participants for this team"} />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map(player => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="points-input">Points</Label>
                    <Input
                      id="points-input"
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder="Enter points to award..."
                    />
                  </div>
                </>
              )}

              {/* Team Mode Fields */}
              {assignmentMode === 'team' && (
                <>
                  <div>
                    <Label htmlFor="team-points-input">Total Team Points</Label>
                    <Input
                      id="team-points-input"
                      type="number"
                      value={teamPoints}
                      onChange={(e) => setTeamPoints(e.target.value)}
                      placeholder="Enter total points for team..."
                    />
                  </div>

                  {/* Custom Distribution */}
                  {players.length > 0 && teamPoints && (
                    <div>
                      <Label>Point Distribution ({players.length} participants)</Label>
                      <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                        {players.map(player => (
                          <div key={player.id} className="flex items-center gap-2">
                            <span className="text-sm font-medium min-w-0 flex-1 truncate">
                              {player.name}
                            </span>
                            <Input
                              type="number"
                              value={customDistribution[player.id] || 0}
                              onChange={(e) => setCustomDistribution(prev => ({
                                ...prev,
                                [player.id]: parseInt(e.target.value) || 0
                              }))}
                              className="w-20"
                              min="0"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Total distributed: {Object.values(customDistribution).reduce((sum, val) => sum + val, 0)} / {parseInt(teamPoints) || 0}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <Label htmlFor="game-select">Game/Activity</Label>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a game..." />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map(game => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason-input">Reason (Optional)</Label>
                <Input
                  id="reason-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., 'Won night game', 'Team participation'..."
                />
              </div>

              <Button 
                onClick={addPoints} 
                disabled={loading || 
                  !selectedTeam || 
                  !selectedGame ||
                  (assignmentMode === 'individual' && (!selectedPlayer || !points)) ||
                  (assignmentMode === 'team' && !teamPoints)
                }
                className="w-full"
              >
                {loading ? "Adding..." : assignmentMode === 'individual' ? "Add Points" : "Distribute Team Points"}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-camp-pink" />
                Recent Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.team.color }}
                      />
                      <div>
                        <p className="font-medium">{entry.team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.reason || 'Points awarded'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={entry.points > 0 ? "default" : "destructive"}>
                        {entry.points > 0 ? '+' : ''}{entry.points}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentEntries.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No entries yet. Start by adding some points!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};