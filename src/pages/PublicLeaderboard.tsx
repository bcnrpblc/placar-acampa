import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamCard, Team } from "../components/TeamCard";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import type * as React from "react";
import { useEventId } from "@/lib/useEventId";
import { parseTheme, themeStyle } from "@/lib/theme";

interface TeamWithAggregate extends Team {
  rank?: number;
  previousPoints?: number;
}


/** Teams per row for a TV layout: 2→2, 3→3, 4→2x2, 5→3+2, 6→3x2, 8→4x2, 10→5x2. */
const columnsFor = (n: number) => {
  if (n <= 3) return Math.max(n, 1);
  if (n === 4) return 2;
  if (n <= 6) return 3;
  if (n <= 8) return 4;
  if (n === 9) return 3;
  return 5;
};

const PublicLeaderboard = () => {
  const [teams, setTeams] = useState<TeamWithAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { eventId, event, notFound } = useEventId();
  const prevTotals = useRef<Map<string, number>>(new Map());
  const prevLeader = useRef<string | null>(null);
  const [newLeaderId, setNewLeaderId] = useState<string | null>(null);

  // Fetch teams with their current points (teams only, no individual players)
  const fetchTeamData = async () => {
    if (!eventId) return;
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          color,
          avatar_url
        `)
        .eq('event_id', eventId);

      const { data: aggregatesData, error: aggregatesError } = await supabase
        .from('team_aggregates')
        .select(`
          team_id,
          total_points
        `)
        .eq('event_id', eventId);

      if (teamsError) throw teamsError;
      if (aggregatesError) throw aggregatesError;

      // Combine team data with aggregates (no player data)
      const teamsWithPoints: TeamWithAggregate[] = (teamsData || []).map(team => {
        const aggregate = aggregatesData?.find(a => a.team_id === team.id);

        return {
          ...team,
          total_points: aggregate?.total_points || 0
        };
      });

      // Sort by points and assign ranks
      const sortedTeams = teamsWithPoints
        .sort((a, b) => b.total_points - a.total_points)
        .map((team, index) => ({
          ...team,
          rank: index + 1,
          previousPoints: prevTotals.current.get(team.id),
        }));

      // One-time highlight when the lead changes hands
      const leader = sortedTeams[0]?.total_points > 0 ? sortedTeams[0].id : null;
      if (leader && prevLeader.current && leader !== prevLeader.current) {
        setNewLeaderId(leader);
        setTimeout(() => setNewLeaderId(null), 6000);
      }
      prevLeader.current = leader;
      prevTotals.current = new Map(sortedTeams.map((t) => [t.id, t.total_points]));

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
    if (!eventId) {
      if (notFound) setLoading(false);
      return;
    }
    fetchTeamData();

    // Subscribe to team_aggregates changes
    const aggregatesChannel = supabase
      .channel(`team_aggregates_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_aggregates',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          console.log('Team aggregates updated, refreshing...');
          fetchTeamData();
        }
      )
      .subscribe();

    // Subscribe to score_entries for live updates (affects team totals)
    const scoresChannel = supabase
      .channel(`score_entries_${eventId}`)
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
  }, [eventId, notFound]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center text-muted-foreground">
        Evento não encontrado.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-camp-cyan mb-4"></div>
          <p className="text-xl text-muted-foreground">Carregando o placar...</p>
        </div>
      </div>
    );
  }

  const cols = columnsFor(teams.length);
  const rows: TeamWithAggregate[][] = [];
  for (let i = 0; i < teams.length; i += cols) rows.push(teams.slice(i, i + cols));
  const subtitle = event?.subtitle?.trim();
  const theme = parseTheme(event?.theme);
  const pill = {
    fontSize: "1.6vmin",
    fontFamily: "Barlow, sans-serif",
    color: "var(--sb-text)",
    borderColor: "var(--sb-accent)",
    background: "var(--sb-panel)",
  } as const;

  return (
    <div
      className="h-screen w-screen overflow-hidden relative flex flex-col"
      style={{
        padding: "4vmin",
        gap: "2.5vmin",
        fontFamily: "var(--sb-font)",
        ...themeStyle(theme),
      } as React.CSSProperties}
    >
      <Button
        onClick={() => navigate('/admin')}
        className="fixed top-2 left-2 z-50 opacity-20 hover:opacity-100"
        variant="outline"
        size="sm"
      >
        <Settings className="w-4 h-4 mr-2" />
        Admin
      </Button>

      {/* Header band: event name, optional subtitle (title grows when there is none) */}
      <div className="text-center shrink-0">
        {theme.useLogo && theme.logo && (
          <img src={theme.logo} alt="" className="mx-auto object-contain" style={{ height: "9vmin", marginBottom: "1vmin" }} />
        )}
        <h1
          className="font-extrabold uppercase leading-none"
          style={{ fontSize: subtitle ? "8vmin" : "11vmin", color: "var(--sb-accent)", letterSpacing: "0.02em" }}
        >
          {event?.title}
        </h1>
        {subtitle && (
          <p className="font-bold uppercase opacity-80" style={{ fontSize: "3.2vmin", marginTop: "1vmin", letterSpacing: "0.12em" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="shrink-0" style={{ height: "0.4vmin", background: "var(--sb-accent)", opacity: 0.8 }} />

      {/* Teams: rows of equal height; incomplete last row is centered */}
      <div className="flex-1 min-h-0 flex flex-col" style={{ gap: "2.5vmin" }}>
        {rows.map((row, r) => (
          <div key={r} className="flex-1 min-h-0 flex justify-center" style={{ gap: "2.5vmin" }}>
            {row.map((team, i) => {
              const index = r * cols + i;
              const isLeader = index === 0 && team.total_points > 0;
              return (
                <div
                  key={team.id}
                  className="min-w-0 h-full"
                  style={{ flex: `0 0 calc((100% - ${(cols - 1) * 2.5}vmin) / ${cols})` }}
                >
                  <TeamCard
                    team={team}
                    rank={team.rank || index + 1}
                    isLeader={isLeader}
                    previousPoints={team.previousPoints}
                    highlightNew={newLeaderId === team.id}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom right: last update and live pills (inside the safe zone) */}
      <div className="absolute flex items-center" style={{ bottom: "1.2vmin", right: "2vmin", gap: "1vmin" }}>
        <Badge variant="outline" style={pill}>
          Atualizado às {format(lastUpdate, "HH:mm")} em {format(lastUpdate, "dd/MM")}
        </Badge>
        <Badge variant="outline" style={pill}>
          <span className="relative flex mr-2" style={{ width: "1vmin", height: "1vmin" }}>
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "var(--sb-accent)" }} />
            <span className="relative rounded-full w-full h-full" style={{ background: "var(--sb-accent)" }} />
          </span>
          AO VIVO
        </Badge>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
