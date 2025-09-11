-- Create the increment_team_points function
CREATE OR REPLACE FUNCTION increment_team_points(target_team_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update team_aggregates
  INSERT INTO team_aggregates (team_id, total_points, last_updated)
  VALUES (target_team_id, points_to_add, now())
  ON CONFLICT (team_id)
  DO UPDATE SET 
    total_points = team_aggregates.total_points + points_to_add,
    last_updated = now();
END;
$$;