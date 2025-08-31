import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UndoScoreRequest {
  entry_id: string;
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

    const { entry_id, created_by }: UndoScoreRequest = await req.json();

    console.log('Undoing score entry:', entry_id);

    // Get the original entry
    const { data: originalEntry, error: fetchError } = await supabaseClient
      .from('score_entries')
      .select('*')
      .eq('id', entry_id)
      .single();

    if (fetchError || !originalEntry) {
      throw new Error('Score entry not found');
    }

    // Check if already undone
    const { data: existingUndo } = await supabaseClient
      .from('score_entries')
      .select('id')
      .ilike('reason', `%UNDO: ${entry_id}%`)
      .single();

    if (existingUndo) {
      throw new Error('Entry already undone');
    }

    // Get round to check if day is locked
    const { data: round, error: roundError } = await supabaseClient
      .from('rounds')
      .select('day')
      .eq('id', originalEntry.round_id)
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
      throw new Error('Cannot undo - day is locked');
    }

    // Create compensating entry with negative points
    const { data: undoEntry, error: undoError } = await supabaseClient
      .from('score_entries')
      .insert({
        round_id: originalEntry.round_id,
        team_id: originalEntry.team_id,
        player_id: originalEntry.player_id,
        points: -originalEntry.points,
        reason: `UNDO: ${entry_id} - ${originalEntry.reason}`,
        created_by
      })
      .select()
      .single();

    if (undoError) {
      throw undoError;
    }

    // Update team aggregates
    const { error: aggregateError } = await supabaseClient
      .rpc('increment_team_points', {
        target_team_id: originalEntry.team_id,
        points_to_add: -originalEntry.points
      });

    if (aggregateError) {
      throw aggregateError;
    }

    // Get updated team aggregate
    const { data: updatedAggregate } = await supabaseClient
      .from('team_aggregates')
      .select('total_points')
      .eq('team_id', originalEntry.team_id)
      .single();

    console.log('Score undone successfully:', { undoEntry, updatedTotal: updatedAggregate?.total_points });

    return new Response(
      JSON.stringify({ 
        success: true, 
        undoEntry,
        newTotal: updatedAggregate?.total_points || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in undo-score function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});