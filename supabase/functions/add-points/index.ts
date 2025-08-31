import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddPointsRequest {
  round_id: string;
  team_id: string;
  participant_points: number;
  mvp_player_id?: string;
  mvp_points?: number;
  reason?: string;
  created_by?: string;
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

    const { 
      round_id, 
      team_id, 
      participant_points, 
      mvp_player_id, 
      mvp_points, 
      reason = 'participation',
      created_by 
    }: AddPointsRequest = await req.json();

    console.log('Adding points:', { round_id, team_id, participant_points, mvp_player_id, mvp_points });

    // Verify round exists and get its day
    const { data: round, error: roundError } = await supabaseClient
      .from('rounds')
      .select('day')
      .eq('id', round_id)
      .single();

    if (roundError || !round) {
      throw new Error('Round not found');
    }

    // Check if day is locked
    const { data: snapshot } = await supabaseClient
      .from('daily_snapshots')
      .select('id')
      .eq('day', round.day)
      .single();

    if (snapshot) {
      throw new Error('Cannot add points - day is locked');
    }

    // Start transaction-like operations
    const scoreEntries = [];

    // Add participation points for team
    const { data: participationEntry, error: participationError } = await supabaseClient
      .from('score_entries')
      .insert({
        round_id,
        team_id,
        points: participant_points,
        reason: reason,
        created_by
      })
      .select()
      .single();

    if (participationError) {
      throw participationError;
    }
    scoreEntries.push(participationEntry);

    // Add MVP points if specified
    if (mvp_player_id && mvp_points) {
      const { data: mvpEntry, error: mvpError } = await supabaseClient
        .from('score_entries')
        .insert({
          round_id,
          team_id,
          player_id: mvp_player_id,
          points: mvp_points,
          reason: 'MVP award',
          created_by
        })
        .select()
        .single();

      if (mvpError) {
        throw mvpError;
      }
      scoreEntries.push(mvpEntry);
    }

    // Update team aggregates
    const totalPoints = participant_points + (mvp_points || 0);
    const { error: aggregateError } = await supabaseClient
      .rpc('increment_team_points', {
        target_team_id: team_id,
        points_to_add: totalPoints
      });

    if (aggregateError) {
      throw aggregateError;
    }

    // Get updated team aggregate
    const { data: updatedAggregate } = await supabaseClient
      .from('team_aggregates')
      .select('total_points')
      .eq('team_id', team_id)
      .single();

    console.log('Points added successfully:', { scoreEntries, updatedTotal: updatedAggregate?.total_points });

    return new Response(
      JSON.stringify({ 
        success: true, 
        scoreEntries,
        newTotal: updatedAggregate?.total_points || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in add-points function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});