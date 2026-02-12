-- Seed test claims for S3-03 in DEV database

-- 1. Orphaned claim (8 days under review)
INSERT INTO claims (
  member_id,
  task_id,
  status,
  submitted_at,
  reviewed_at,
  reviewer_id
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  'under_review',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days',
  '00000000-0000-0000-0000-000000000000'
);

-- 2. Submitted claim (awaiting review)
INSERT INTO claims (
  member_id,
  task_id,
  status,
  submitted_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  'submitted',
  NOW() - INTERVAL '2 days'
);

-- 3. Under review for 3 days (NOT orphaned)
INSERT INTO claims (
  member_id,
  task_id,
  status,
  submitted_at,
  reviewed_at,
  reviewer_id
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '40000000-0000-0000-0000-000000000001',
  'under_review',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days',
  '00000000-0000-0000-0000-000000000002'
);

-- Verify
SELECT 
  c.status,
  COUNT(*) as count,
  CASE 
    WHEN c.status = 'under_review' AND c.reviewed_at < NOW() - INTERVAL '7 days'
    THEN 'ORPHANED'
    ELSE 'OK'
  END as check_status
FROM claims c
GROUP BY c.status, check_status
ORDER BY c.status;
