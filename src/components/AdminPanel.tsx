import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Undo2, Trophy, Users, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DayRevealSpectacle } from "./DayRevealSpectacle";

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
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGame, setSelectedGame] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  
  // Day reveal state
  const [showDayReveal, setShowDayReveal] = useState(false);
  const [daySnapshot, setDaySnapshot] = useState(null);
  const [revealLoading, setRevealLoading] = useState(false);
  
  const { toast } = useToast();

  // Fetch initial data
  useEffect(() => {
    fetchTeams();
    fetchGames();
    fetchRecentEntries();
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('name');
    if (data) setTeams(data);
  };

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('title');
    if (data) setGames(data);
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
    if (!selectedTeam || !points || !selectedGame) {
      toast({
        title: "Missing Information",
        description: "Please select team, game, and enter points",
        variant: "destructive"
      });
      return;
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

      // Add score entry
      const { error: scoreError } = await supabase
        .from('score_entries')
        .insert({
          round_id: roundId,
          team_id: selectedTeam,
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

      // Reset form
      setPoints("");
      setReason("");
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

  const undoScore = async (entryId: string) => {
    try {
      const response = await supabase.functions.invoke('undo-score', {
        body: { entry_id: entryId }
      });

      if (response.error) throw response.error;

      toast({
        title: "Score Undone",
        description: "The score entry has been reversed",
      });

      fetchRecentEntries();
    } catch (error) {
      console.error('Error undoing score:', error);
      toast({
        title: "Error",
        description: "Failed to undo score. Please try again.",
        variant: "destructive"
      });
    }
  };

  const revealDay = async () => {
    setRevealLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await supabase.functions.invoke('reveal-day', {
        body: { day: today }
      });

      if (response.error) throw response.error;

      setDaySnapshot(response.data.snapshot);
      setShowDayReveal(true);

      toast({
        title: "Day Revealed!",
        description: "Daily scores have been locked and the reveal has started",
      });

    } catch (error) {
      console.error('Error revealing day:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reveal day. Please try again.",
        variant: "destructive"
      });
    }
    setRevealLoading(false);
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

        {/* Day Reveal Section */}
        <Card className="bg-card/50 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-500" />
              Day Reveal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Lock today's scores and reveal the day winner
                </p>
                <p className="text-xs text-muted-foreground">
                  Warning: This action cannot be undone and will prevent further score additions for today
                </p>
              </div>
              <Button 
                onClick={revealDay}
                disabled={revealLoading}
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                {revealLoading ? "Revealing..." : "🏆 REVEAL DAY"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                <Label htmlFor="points-input">Points</Label>
                <Input
                  id="points-input"
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Enter points to award..."
                />
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
                disabled={loading || !selectedTeam || !points || !selectedGame}
                className="w-full"
              >
                {loading ? "Adding..." : "Add Points"}
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
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Badge variant={entry.points > 0 ? "default" : "destructive"}>
                          {entry.points > 0 ? '+' : ''}{entry.points}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      {!entry.reason?.includes('UNDO:') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => undoScore(entry.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                      )}
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

      {/* Day Reveal Spectacle Modal */}
      <DayRevealSpectacle 
        isOpen={showDayReveal}
        onClose={() => setShowDayReveal(false)}
        snapshot={daySnapshot}
      />
    </div>
  );
};