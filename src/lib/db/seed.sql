-- Trust Builder Seed Data
-- Season 0: Webinar Series MVP
--
-- IMPORTANT: Seed tasks are created in 'open' state with published_at set.
-- This bypasses the Draft→Open lifecycle for convenience. Production task
-- creation (S2) MUST go through the proper Draft→Open gate.

-- ============================================================================
-- SYSTEM MEMBER (for created_by references)
-- ============================================================================

INSERT INTO members (id, email, member_id, display_name, role, trust_score_cached)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@futuresedge.org',
  'FE-M-00000',
  'System',
  'guardian',
  0
);

-- ============================================================================
-- GROUPS: Colony + Mission
-- ============================================================================

-- Colony: Future's Edge root container
INSERT INTO groups (id, name, type, description, status, parent_group_id)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Future''s Edge',
  'colony',
  'The Future''s Edge Colony — building regenerative systems together',
  'active',
  NULL
);

-- Mission: Webinar Series Season 0
INSERT INTO groups (id, name, type, description, status, parent_group_id)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Webinar Series Season 0',
  'mission',
  'Launch mission for Season 0 — attend webinars, share reflections, earn trust',
  'active',
  '10000000-0000-0000-0000-000000000001'
);

-- ============================================================================
-- INCENTIVES: 5 Canonical Dimensions
-- ============================================================================

INSERT INTO incentives (id, name, description) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'Participation',
    'Showing up, attending events, basic engagement'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Collaboration',
    'Helping others, peer review, teamwork'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Innovation',
    'New ideas, research, prototyping, creative input'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'Leadership',
    'Initiative, mentoring, proposing missions'
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    'Impact',
    'Direct mission advancement, external value creation'
  );

-- ============================================================================
-- TASK 1: Attend Live Webinar (Simple, Auto-Approve)
-- ============================================================================

INSERT INTO tasks (
  id,
  group_id,
  title,
  description,
  rationale,
  state,
  task_type,
  verification_method,
  max_completions,
  version,
  created_by,
  published_at
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', -- Webinar Mission
  'Attend Live Webinar',
  'Join a Future''s Edge live webinar session. Bring your curiosity and questions!',
  'Participation is the foundation of community. By showing up, you create the conditions for connection and learning.',
  'open', -- Direct to 'open' (seed data shortcut)
  'simple',
  'auto_approve',
  NULL, -- Unlimited completions
  1,
  '00000000-0000-0000-0000-000000000000', -- System
  NOW()
);

-- Criterion for Task 1
INSERT INTO criteria (id, task_id, description, proof_type, verification_method, sort_order)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'Confirm you attended the webinar (session name or date)',
  'text',
  'auto_approve',
  1
);

-- Task Incentive: 50 Participation points
INSERT INTO task_incentives (task_id, incentive_id, points)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001', -- Participation
  50
);

-- ============================================================================
-- TASK 2: Basic Webinar Reflection (Simple, Auto-Approve)
-- ============================================================================

INSERT INTO tasks (
  id,
  group_id,
  title,
  description,
  rationale,
  state,
  task_type,
  verification_method,
  max_completions,
  version,
  created_by,
  published_at
) VALUES (
  '40000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001', -- Webinar Mission
  'Basic Webinar Reflection',
  'Write a 200-500 word reflection on what you learned or a question that emerged during the webinar.',
  'Reflection deepens learning and creates knowledge artifacts for the community. Your insights may spark new ideas in others.',
  'open', -- Direct to 'open' (seed data shortcut)
  'simple',
  'auto_approve',
  NULL, -- Unlimited completions
  1,
  '00000000-0000-0000-0000-000000000000', -- System
  NOW()
);

-- Criterion for Task 2
INSERT INTO criteria (id, task_id, description, proof_type, verification_method, sort_order)
VALUES (
  '50000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  'Write a 200-500 word reflection on your key takeaway, question, or idea',
  'text',
  'auto_approve',
  1
);

-- Task Incentives: 15 Participation + 10 Innovation
INSERT INTO task_incentives (task_id, incentive_id, points) VALUES
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001', -- Participation
    15
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003', -- Innovation
    10
  );

-- ============================================================================
-- SEED COMPLETE
-- ============================================================================

-- Verification queries:
-- SELECT COUNT(*) FROM groups; -- Should be 2 (Colony + Mission)
-- SELECT COUNT(*) FROM incentives; -- Should be 5
-- SELECT COUNT(*) FROM tasks; -- Should be 2
-- SELECT COUNT(*) FROM criteria; -- Should be 2
-- SELECT COUNT(*) FROM task_incentives; -- Should be 3 (50 + 15 + 10)
