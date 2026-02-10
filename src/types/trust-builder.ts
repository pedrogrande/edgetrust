/**
 * Trust Builder Type Definitions
 * Maps to the ONE 6-dimension ontology
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum TaskState {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ClaimStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  REVISION_REQUESTED = 'revision_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ProofType {
  TEXT = 'text',
  URL = 'url',
  FILE = 'file',
}

export enum VerificationMethod {
  AUTO_APPROVE = 'auto_approve',
  PEER_REVIEW = 'peer_review',
  ADMIN_REVIEW = 'admin_review',
}

export enum TaskType {
  SIMPLE = 'simple',
  COMPLEX = 'complex',
}

export enum GroupType {
  COLONY = 'colony',
  MISSION = 'mission',
}

export enum MemberRole {
  EXPLORER = 'explorer',
  CONTRIBUTOR = 'contributor',
  STEWARD = 'steward',
  GUARDIAN = 'guardian',
}

export enum IncentiveDimension {
  PARTICIPATION = 'participation',
  COLLABORATION = 'collaboration',
  INNOVATION = 'innovation',
  LEADERSHIP = 'leadership',
  IMPACT = 'impact',
}

/**
 * Canonical Event Type Taxonomy
 * All event logging MUST use these enum values — never raw strings
 */
export enum EventType {
  // S1: Core lifecycle events
  MEMBER_CREATED = 'member.created',
  CLAIM_SUBMITTED = 'claim.submitted',
  CLAIM_APPROVED = 'claim.approved',
  CLAIM_REJECTED = 'claim.rejected', // placeholder for S2
  TRUST_UPDATED = 'trust.updated',

  // S2: Admin & reviewer workflows
  TASK_CREATED = 'task.created',
  TASK_PUBLISHED = 'task.published',
  TASK_CANCELLED = 'task.cancelled',
  MEMBERSHIP_JOINED = 'membership.joined',
  CLAIM_REVISION_REQUESTED = 'claim.revision_requested',
  CLAIM_REVIEW_ASSIGNED = 'claim.review_assigned',
  CLAIM_REVIEW_TIMEOUT = 'claim.review_timeout',
  CLAIM_REVIEW_RELEASED = 'claim.review_released',
}

// ============================================================================
// TABLE INTERFACES (ONE Ontology Dimensions)
// ============================================================================

/**
 * GROUPS dimension: Colony and Mission containers
 */
export interface Group {
  id: string;
  name: string;
  type: GroupType;
  description: string | null;
  status: 'active' | 'archived';
  parent_group_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * PEOPLE dimension: Members with portable IDs
 */
export interface Member {
  id: string;
  email: string;
  member_id: string; // FE-M-XXXXX format
  display_name: string | null;
  role: MemberRole;
  trust_score_cached: number; // Cache only — derived from events is authoritative
  created_at: Date;
  updated_at: Date;
}

/**
 * THINGS dimension: Tasks (contracts)
 */
export interface Task {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  state: TaskState;
  task_type: TaskType;
  verification_method: VerificationMethod;
  max_completions: number | null; // null = unlimited
  version: number;
  created_by: string;
  created_at: Date;
  published_at: Date | null;
  updated_at: Date;
}

/**
 * THINGS dimension: Task acceptance criteria
 */
export interface Criterion {
  id: string;
  task_id: string;
  description: string;
  proof_type: ProofType;
  verification_method: VerificationMethod;
  sort_order: number;
  created_at: Date;
}

/**
 * THINGS dimension: Incentive dimensions (5 canonical types)
 */
export interface Incentive {
  id: string;
  name: string;
  description: string;
  created_at: Date;
}

/**
 * CONNECTIONS dimension: Task-to-Incentive point allocations
 */
export interface TaskIncentive {
  task_id: string;
  incentive_id: string;
  points: number;
  created_at: Date;
}

/**
 * CONNECTIONS dimension: Member-to-Mission memberships
 */
export interface Membership {
  member_id: string;
  group_id: string;
  role: string;
  joined_at: Date;
}

/**
 * CONNECTIONS dimension: Task completion claims
 */
export interface Claim {
  id: string;
  member_id: string;
  task_id: string;
  status: ClaimStatus;
  submitted_at: Date;
  reviewed_at: Date | null;
  reviewer_id: string | null;
  review_notes: string | null;
  revision_count: number; // S2-04: Track revision cycles (max 2)
  review_deadline: Date | null; // S2-04: Auto-release after 72 hours
}

/**
 * CONNECTIONS dimension: Evidence per criterion
 */
export interface Proof {
  id: string;
  claim_id: string;
  criterion_id: string;
  content_text: string | null;
  content_url: string | null;
  content_hash: string | null; // SHA-256 for S2 file uploads
  created_at: Date;
}

/**
 * EVENTS dimension: Immutable audit ledger
 */
export interface TrustEvent {
  id: number; // BIGSERIAL
  timestamp: Date;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  event_type: EventType;
  metadata: Record<string, unknown>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Task with group and incentive details
 */
export interface TaskWithIncentives extends Task {
  group_name: string;
  incentives: Array<{
    name: string;
    points: number;
  }>;
  total_value: number;
  criteria_count: number;
}

/**
 * Claim with task details
 */
export interface ClaimWithTask extends Claim {
  task_title: string;
  task_type: TaskType;
  points_earned: number | null;
}

/**
 * Trust score breakdown by dimension
 * Aggregated from events.metadata->>'dimensions'
 * Flexible structure supports any dimension names from task incentives
 */
export interface DimensionBreakdown {
  total: number;
  dimensions: Record<string, number>;
}

/**
 * Dashboard summary data
 */
export interface DashboardData {
  member: Member;
  trustScore: number; // Derived from events
  rank: MemberRole;
  dimensions: DimensionBreakdown;
  claims: ClaimWithTask[];
  stats: {
    tasksCompleted: number;
    claimsPending: number;
    availableTasks: number;
  };
}

/**
 * EVENTS dimension: Immutable audit ledger entries
 */
export interface Event {
  id: number; // BIGSERIAL in PostgreSQL maps to number in JavaScript
  timestamp: Date;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  metadata: Record<string, any>;
}

export type EventTypeFilter = 'all' | 'claim' | 'trust' | 'member';
