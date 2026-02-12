-- Create test claims for S3-03 manual testing

-- 1. A submitted claim (awaiting review, not assigned yet)
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

-- 2. A claim under review for only 3 days (NOT orphaned, should show yellow)
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

-- Verify all claims
SELECT 
  c.id,
  t.title,
  submitter.email AS submitter,
  c.status,
  COALESCE(reviewer.email, 'unassigned') AS reviewer,
  EXTRACT(DAY FROM (NOW() - c.submitted_at))::INTEGER AS days_since_submit,
  CASE 
    WHEN c.reviewed_at IS NOT NULL 
    THEN EXTRACT(DAY FROM (NOW() - c.reviewed_at))::INTEGER 
    ELSE NULL 
  END AS days_in_review,
  CASE
    WHEN c.status = 'under_review' AND c.reviewed_at < NOW() - INTERVAL '7 days'
    THEN 'ORPHANED'
    ELSE 'OK'
  END AS orphan_status
FROM claims c
JOIN tasks t ON c.task_id = t.id
JOIN members submitter ON submitter.id = c.member_id
LEFT JOIN members reviewer ON reviewer.id = c.reviewer_id
ORDER BY c.submitted_at DESC;
