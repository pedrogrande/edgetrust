-- S4-03A QA Validation Tests
-- Run comprehensive tests against acceptance criteria

\echo '=== AC1: Groups table schema ==='
\d groups

\echo ''
\echo '=== AC2 & AC3: Memberships table schema ==='
\d memberships

\echo ''
\echo '=== AC4, AC5, AC6: Verify stable IDs and seed data ==='
SELECT stable_id, name, type, min_trust_score 
FROM groups 
ORDER BY stable_id;

\echo ''
\echo '=== AC7: Test get_active_missions() helper ==='
SELECT stable_id, name, min_trust_score, member_count, task_count, is_eligible
FROM get_active_missions('00000000-0000-0000-0000-000000000001'::UUID, 300)
ORDER BY min_trust_score;

\echo ''
\echo '=== AC8: Test get_mission_members() helper ==='
\echo 'Testing with mission FE-M-00001...'
SELECT COUNT(*) as member_count
FROM get_mission_members('20000000-0000-0000-0000-000000000001'::UUID);

\echo ''
\echo '=== AC9: Check for duplicate stable_ids ==='
SELECT stable_id, COUNT(*) as count
FROM groups
GROUP BY stable_id
HAVING COUNT(*) > 1;

\echo ''
\echo '=== AC10: Check for NULL stable_ids ==='
SELECT COUNT(*) as null_count
FROM groups
WHERE stable_id IS NULL;

\echo ''
\echo '=== AC11: Test re-join scenario ==='
\echo 'Step 1: Insert test membership...'
INSERT INTO memberships (member_id, group_id, role, joined_at, status)
VALUES ('00000000-0000-0000-0000-000000000099'::UUID, 
        '20000000-0000-0000-0000-000000000001'::UUID, 
        'Member', NOW(), 'active')
ON CONFLICT DO NOTHING;

\echo 'Step 2: Verify active membership exists...'
SELECT COUNT(*) as active_memberships
FROM memberships
WHERE member_id = '00000000-0000-0000-0000-000000000099'::UUID
AND group_id = '20000000-0000-0000-0000-000000000001'::UUID
AND status = 'active';

\echo 'Step 3: Leave mission...'
UPDATE memberships
SET status = 'left', left_at = NOW()
WHERE member_id = '00000000-0000-0000-0000-000000000099'::UUID
AND group_id = '20000000-0000-0000-0000-000000000001'::UUID
AND status = 'active';

\echo 'Step 4: Verify can re-join...'
INSERT INTO memberships (member_id, group_id, role, joined_at, status)
VALUES ('00000000-0000-0000-0000-000000000099'::UUID, 
        '20000000-0000-0000-0000-000000000001'::UUID, 
        'Member', NOW(), 'active');

\echo 'Step 5: Verify re-join successful...'
SELECT COUNT(*) as active_after_rejoin
FROM memberships
WHERE member_id = '00000000-0000-0000-0000-000000000099'::UUID
AND group_id = '20000000-0000-0000-0000-000000000001'::UUID
AND status = 'active';

\echo 'Step 6: Cleanup test data...'
DELETE FROM memberships
WHERE member_id = '00000000-0000-0000-0000-000000000099'::UUID
AND group_id = '20000000-0000-0000-0000-000000000001'::UUID;

\echo ''
\echo '=== Ontology Validation ==='
\echo 'Check: All missions are in groups table (not separate table)'
SELECT COUNT(*) as mission_count, 'groups table' as location
FROM groups WHERE type = 'mission';

\echo ''
\echo 'Check: All memberships in one table (no mission_members table)'
SELECT COUNT(*) as membership_count, 'memberships table' as location
FROM memberships;

\echo ''
\echo '=== Migration Readiness Check ==='
\echo 'Stable ID format validation (should all start with FE-)'
SELECT stable_id, 
       CASE 
         WHEN stable_id LIKE 'FE-G-%' THEN 'Colony/Group (correct)'
         WHEN stable_id LIKE 'FE-M-%' THEN 'Mission (correct)'
         ELSE 'INVALID FORMAT'
       END as format_check
FROM groups
ORDER BY stable_id;

\echo ''
\echo '=== QA VALIDATION COMPLETE ==='
