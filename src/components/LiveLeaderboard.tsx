import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamCard, Team } from "./TeamCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Users, Activity } from "lucide-react";
import { format } from "date-fns";

interface TeamWithAggregate extends Team {
  rank?: number;
}

export const LiveLeaderboard = () => {
  const [teams, setTeams] = useState<TeamWithAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeViewers, setActiveViewers] = useState(1);

  // Fetch teams with their current points
  const fetchTeamData = async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          color,
          avatar_url
        `);

      const { data: aggregatesData, error: aggregatesError } = await supabase
        .from('team_aggregates')
        .select(`
          team_id,
          total_points
        `);

      if (teamsError) throw teamsError;
      if (aggregatesError) throw aggregatesError;

      // Get top players for each team
      const { data: playersData } = await supabase
        .from('score_entries')
        .select(`
          player_id,
          team_id,
          players!inner(id, name, team_id),
          points
        `)
        .not('player_id', 'is', null);

      // Group players by team and sum their points
      const playersByTeam: Record<string, Array<{id: string; name: string; points: number}>> = {};
      
      if (playersData) {
        playersData.forEach(entry => {
          if (!entry.player_id || !entry.players) return;
          
          const teamId = entry.team_id;
          if (!playersByTeam[teamId]) {
            playersByTeam[teamId] = [];
          }
          
          const existingPlayer = playersByTeam[teamId].find(p => p.id === entry.player_id);
          if (existingPlayer) {
            existingPlayer.points += entry.points;
          } else {
            playersByTeam[teamId].push({
              id: entry.player_id,
              name: entry.players.name,
              points: entry.points
            });
          }
        });
      }

      // Combine team data with aggregates and top players
      const teamsWithPoints: TeamWithAggregate[] = (teamsData || []).map(team => {
        const aggregate = aggregatesData?.find(a => a.team_id === team.id);
        const topPlayers = (playersByTeam[team.id] || [])
          .sort((a, b) => b.points - a.points)
          .slice(0, 3);

        return {
          ...team,
          total_points: aggregate?.total_points || 0,
          top_players: topPlayers
        };
      });

      // Sort by points and assign ranks
      const sortedTeams = teamsWithPoints
        .sort((a, b) => b.total_points - a.total_points)
        .map((team, index) => ({ ...team, rank: index + 1 }));

      setTeams(sortedTeams);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team data:', error);
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchTeamData();

    // Subscribe to team_aggregates changes
    const aggregatesChannel = supabase
      .channel('team_aggregates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_aggregates'
        },
        () => {
          console.log('Team aggregates updated, refreshing...');
          fetchTeamData();
        }
      )
      .subscribe();

    // Subscribe to score_entries for live updates
    const scoresChannel = supabase
      .channel('score_entries_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'score_entries'
        },
        () => {
          console.log('New score entry, refreshing...');
          fetchTeamData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(aggregatesChannel);
      supabase.removeChannel(scoresChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-camp-cyan mb-4"></div>
          <p className="text-xl text-muted-foreground">Loading Camp Clash Leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <div className="bg-gradient-glow">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-6xl md:text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-4">
              CAMP CLASH
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-2">
              Live Leaderboard • Weekend Warriors
            </p>
            <div className="text-sm text-muted-foreground mb-4">
              "Follow God's example, therefore, as dearly loved children" - Ephesians 5:1
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
              <CardContent className="flex items-center gap-2 p-4">
                <Calendar className="w-5 h-5 text-camp-cyan" />
                <div>
                  <p className="text-xs text-muted-foreground">Day</p>
                  <p className="font-bold">{format(new Date(), 'MMM d')}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-camp-pink/20">
              <CardContent className="flex items-center gap-2 p-4">
                <Clock className="w-5 h-5 text-camp-pink" />
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-bold">{format(lastUpdate, 'HH:mm')}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-team-green/20">
              <CardContent className="flex items-center gap-2 p-4">
                <Users className="w-5 h-5 text-team-green" />
                <div>
                  <p className="text-xs text-muted-foreground">Teams</p>
                  <p className="font-bold">{teams.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-team-yellow/20">
              <CardContent className="flex items-center gap-2 p-4">
                <Activity className="w-5 h-5 text-team-yellow" />
                <div>
                  <p className="text-xs text-muted-foreground">Viewers</p>
                  <p className="font-bold">{activeViewers}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Leaderboard Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team, index) => (
            <TeamCard
              key={team.id}
              team={team}
              rank={team.rank || index + 1}
              isLeader={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Live Indicator */}
      <div className="fixed bottom-4 right-4">
        <Badge variant="outline" className="bg-card/80 backdrop-blur-sm border-camp-cyan animate-pulse">
          <div className="w-2 h-2 bg-camp-cyan rounded-full mr-2 animate-ping"></div>
          LIVE
        </Badge>
      </div>
    </div>
  );
};