import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamCard, Team } from "../components/TeamCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Users, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface TeamWithAggregate extends Team {
  rank?: number;
}

const PublicLeaderboard = () => {
  const [teams, setTeams] = useState<TeamWithAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeViewers, setActiveViewers] = useState(1);
  const navigate = useNavigate();

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

      // Get secure player data (without phone numbers)
      const { data: allPlayersData } = await supabase.rpc('get_players_public');
      
      // Get top players for each team using secure player data
      const { data: scoresData } = await supabase
        .from('score_entries')
        .select(`
          player_id,
          team_id,
          points
        `)
        .not('player_id', 'is', null);

      // Create player lookup map
      const playersMap = new Map();
      if (allPlayersData) {
        allPlayersData.forEach((player: any) => {
          playersMap.set(player.id, { name: player.name, team_id: player.team_id });
        });
      }

      // Group players by team and sum their points
      const playersByTeam: Record<string, Array<{id: string; name: string; points: number}>> = {};
      
      if (scoresData) {
        scoresData.forEach(entry => {
          if (!entry.player_id) return;
          
          const player = playersMap.get(entry.player_id);
          if (!player) return;
          
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
              name: player.name,
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
          <p className="text-xl text-muted-foreground">Loading Camp Leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative">
      {/* Floating Admin Button */}
        <Button
          onClick={() => navigate('/auth')}
          className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm hover:bg-card"
          variant="outline"
          size="sm"
        >
          <Settings className="w-4 h-4 mr-2" />
          Admin
        </Button>

      {/* Background Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 text-camp-pink opacity-20 text-9xl">★</div>
        <div className="absolute bottom-40 left-20 text-camp-pink opacity-10 text-6xl">➤</div>
        <div className="absolute top-1/2 right-10 text-camp-pink opacity-15 text-7xl">★</div>
        <div className="absolute bottom-20 right-1/3 text-camp-pink opacity-10 text-5xl">➤</div>
      </div>

      {/* Header */}
      <div className="bg-gradient-glow relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-6xl md:text-8xl font-black bg-gradient-camp bg-clip-text text-transparent mb-2">
              ACAMPAMENTO 25+
            </h1>
            <p className="text-2xl md:text-3xl font-bold text-camp-cyan mb-4">
              Live Leaderboard
            </p>
            <div className="text-sm md:text-base text-muted-foreground mb-4 max-w-2xl mx-auto italic">
              "Therefore be imitators of God, as beloved children" - Ephesians 5:1
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
      <div className="container mx-auto px-4 py-8 relative z-10">
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
      <div className="fixed bottom-4 right-4 z-50">
        <Badge variant="outline" className="bg-card/80 backdrop-blur-sm border-camp-cyan animate-pulse">
          <div className="w-2 h-2 bg-camp-cyan rounded-full mr-2 animate-ping"></div>
          LIVE
        </Badge>
      </div>
    </div>
  );
};

export default PublicLeaderboard;