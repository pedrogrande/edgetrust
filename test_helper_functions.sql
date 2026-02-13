-- Test S4-03A helper functions
-- Test get_active_missions with 300 trust score (eligible for missions 1 and 2)
SELECT 
  stable_id,
  name,
  min_trust_score,
  member_count,
  task_count,
  is_eligible
FROM get_active_missions('00000000-0000-0000-0000-000000000001'::UUID, 300)
ORDER BY min_trust_score;
