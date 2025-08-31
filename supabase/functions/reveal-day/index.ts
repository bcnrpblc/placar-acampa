import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevealDayRequest {
  day: string;
  locked_by?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { day, locked_by }: RevealDayRequest = await req.json();

    console.log('Revealing day:', day);

    // Check if day is already locked
    const { data: existingSnapshot } = await supabaseClient
      .from('daily_snapshots')
      .select('id')
      .eq('day', day)
      .single();

    if (existingSnapshot) {
      throw new Error('Day already locked and revealed');
    }

    // Get teams with their totals at end of day
    const { data: teams, error: teamsError } = await supabaseClient
      .from('teams')
      .select(`
        id,
        name,
        color,
        avatar_url
      `)
      .order('name');

    if (teamsError) {
      throw teamsError;
    }

    // Get all score entries up to end of this day
    const { data: dayScores, error: scoresError } = await supabaseClient
      .from('score_entries')
      .select(`
        team_id,
        player_id,
        points,
        created_at,
        rounds!inner(day),
        players(name)
      `)
      .lte('rounds.day', day);

    if (scoresError) {
      throw scoresError;
    }

    // Calculate day totals and player scores
    const teamDayTotals = new Map();
    const teamCumulativeTotals = new Map();
    const playerScores = new Map();

    // Initialize team totals
    teams.forEach(team => {
      teamDayTotals.set(team.id, 0);
      teamCumulativeTotals.set(team.id, 0);
      playerScores.set(team.id, new Map());
    });

    // Process scores
    dayScores.forEach(entry => {
      const isToday = entry.rounds.day === day;
      
      // Add to cumulative total
      teamCumulativeTotals.set(
        entry.team_id, 
        (teamCumulativeTotals.get(entry.team_id) || 0) + entry.points
      );

      // Add to day total if from today
      if (isToday) {
        teamDayTotals.set(
          entry.team_id,
          (teamDayTotals.get(entry.team_id) || 0) + entry.points
        );

        // Track player scores for today
        if (entry.player_id && entry.players?.name) {
          const teamPlayers = playerScores.get(entry.team_id);
          teamPlayers.set(
            entry.player_id,
            {
              name: entry.players.name,
              points: (teamPlayers.get(entry.player_id)?.points || 0) + entry.points
            }
          );
        }
      }
    });

    // Build ordered teams for reveal
    const orderedTeams = teams.map(team => {
      const teamPlayers = playerScores.get(team.id);
      const topPlayers = Array.from(teamPlayers.values())
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

      return {
        team_id: team.id,
        name: team.name,
        color: team.color,
        avatar_url: team.avatar_url,
        day_points: teamDayTotals.get(team.id) || 0,
        total_points_after_day: teamCumulativeTotals.get(team.id) || 0,
        top_players: topPlayers
      };
    }).sort((a, b) => b.total_points_after_day - a.total_points_after_day);

    // Create snapshot
    const snapshot = {
      day,
      ordered_teams: orderedTeams,
      created_at: new Date().toISOString()
    };

    // Save snapshot to database
    const { data: savedSnapshot, error: snapshotError } = await supabaseClient
      .from('daily_snapshots')
      .insert({
        day,
        snapshot,
        locked_by
      })
      .select()
      .single();

    if (snapshotError) {
      throw snapshotError;
    }

    // Broadcast snapshot created event
    const channel = supabaseClient.channel('day-reveal');
    await channel.send({
      type: 'broadcast',
      event: 'snapshot_created',
      payload: { snapshot, day }
    });

    console.log('Day revealed successfully:', { day, snapshot });

    return new Response(
      JSON.stringify({ 
        success: true, 
        snapshot: savedSnapshot 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reveal-day function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});