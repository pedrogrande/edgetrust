/**
 * ReviewClaim Component
 *
 * Full claim review interface with acceptance criteria and review actions
 * AC23: Supportive language ("Needs More Information" not "Rejected")
 * AC24: Task criteria displayed prominently
 * AC25: Feedback templates guide constructive feedback
 * AC26: Shows member effort indicators
 */

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
  Clock,
  Trophy,
  FileText,
  Download,
} from 'lucide-react';

interface ClaimData {
  id: string;
  member_id: string;
  task_id: string;
  status: string;
  submitted_at: string;
  revision_count: number;
  review_deadline: string;
  task_title: string;
  task_description: string;
  task_rationale: string;
  member_display_name: string;
  member_identifier: string;
  member_trust_score: number;
  criteria: Array<{
    id: string;
    description: string;
    proof_type: string;
    sort_order: number;
  }>;
  proofs: Array<{
    id: string;
    criterion_id: string;
    content_text: string | null;
    file_url: string | null;
    file_hash: string | null;
    file_size: number | null;
    mime_type: string | null;
    criterion_description: string;
  }>;
  incentives: Array<{
    incentive_name: string;
    points: number;
  }>;
}

export default function ReviewClaim({ claimData }: { claimData: ClaimData }) {
  const [decision, setDecision] = useState<
    'approve' | 'reject' | 'revision' | null
  >(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  const totalPoints = claimData.incentives.reduce(
    (sum, inc) => sum + inc.points,
    0
  );

  // AC25: Feedback templates
  const feedbackTemplates = {
    revision: [
      'Please provide more detail about...',
      'Could you clarify how you...',
      'To meet the criteria, please include...',
      'Great start! To strengthen this, consider adding...',
    ],
    reject: [
      "This submission doesn't address the task requirements because...",
      "The evidence provided doesn't demonstrate...",
      'To resubmit successfully, you would need to...',
    ],
  };

  const handleSubmitReview = async () => {
    // Validate feedback for reject/revision (AC7, AC8)
    if (
      (decision === 'reject' || decision === 'revision') &&
      feedback.trim().length < 20
    ) {
      setError(
        'Please provide detailed feedback (minimum 20 characters) to help the member improve.'
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/trust-builder/claims/${claimData.id}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            feedback: feedback.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Success - redirect back to queue
      window.location.href = '/trust-builder/reviews?success=' + decision;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  };

  const handleReleaseClaim = async () => {
    if (
      !confirm('Are you sure you want to release this claim back to the queue?')
    ) {
      return;
    }

    setReleasing(true);
    try {
      const response = await fetch(
        `/api/trust-builder/reviews/${claimData.id}/release`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: 'Reviewer voluntarily released claim',
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to release claim');
      }

      window.location.href = '/trust-builder/reviews';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
      setReleasing(false);
    }
  };

  const formatDeadline = (dateString: string) => {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return 'Deadline passed';
    if (diffHours < 1) return 'Less than 1 hour remaining';
    if (diffHours < 24) return `${diffHours} hours remaining`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Review Deadline Warning */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>Review Deadline:</strong>{' '}
          {formatDeadline(claimData.review_deadline)}
        </AlertDescription>
      </Alert>

      {/* Member Context (AC26: Effort indicators) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submitted by</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">
                {claimData.member_display_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {claimData.member_identifier}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-lg font-semibold">
                  {claimData.member_trust_score}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Trust Score</p>
            </div>
          </div>
          {claimData.revision_count > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>This is revision #{claimData.revision_count}</strong>
                <br />
                The member has already revised this submission{' '}
                {claimData.revision_count} time
                {claimData.revision_count > 1 ? 's' : ''}. Please provide clear,
                actionable feedback.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details */}
      <Card>
        <CardHeader>
          <CardTitle>{claimData.task_title}</CardTitle>
          <CardDescription>{claimData.task_description}</CardDescription>
        </CardHeader>
        <CardContent>
          {claimData.task_rationale && (
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Rationale:</h4>
              <p className="text-sm text-muted-foreground">
                {claimData.task_rationale}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-semibold">{totalPoints} points</span>
            </div>
            {claimData.incentives.map((inc) => (
              <Badge key={inc.incentive_name} variant="secondary">
                {inc.incentive_name}: {inc.points}pts
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Criteria (AC24: Prominent display) */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Acceptance Criteria
          </CardTitle>
          <CardDescription>
            Review the submission against these criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {claimData.criteria.map((criterion, index) => (
              <li key={criterion.id} className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="flex-1 pt-0.5">{criterion.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Proofs Submitted */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence Submitted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {claimData.proofs.map((proof, index) => (
            <div key={proof.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-sm">
                  Criterion {index + 1}: {proof.criterion_description}
                </h4>
              </div>

              {proof.content_text && (
                <div className="bg-muted rounded p-3">
                  <p className="text-sm whitespace-pre-wrap">
                    {proof.content_text}
                  </p>
                </div>
              )}

              {proof.file_url && (
                <div className="flex items-center justify-between bg-muted rounded p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {proof.mime_type?.split('/')[1].toUpperCase()} File
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {proof.file_size && formatFileSize(proof.file_size)}
                        {proof.file_hash &&
                          ` • SHA-256: ${proof.file_hash.substring(0, 16)}...`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(proof.file_url!, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Review Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Your Decision</CardTitle>
          <CardDescription>
            Choose an action and provide feedback to help the member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Decision Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant={decision === 'approve' ? 'default' : 'outline'}
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setDecision('approve')}
            >
              <CheckCircle2 className="h-6 w-6" />
              <span>Approve</span>
              <span className="text-xs opacity-80">Meets all criteria</span>
            </Button>

            <Button
              variant={decision === 'revision' ? 'default' : 'outline'}
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setDecision('revision')}
            >
              <MessageSquare className="h-6 w-6" />
              <span>Request Revision</span>
              <span className="text-xs opacity-80">Needs improvement</span>
            </Button>

            <Button
              variant={decision === 'reject' ? 'default' : 'outline'}
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setDecision('reject')}
            >
              <XCircle className="h-6 w-6" />
              <span>Needs More Info</span>
              <span className="text-xs opacity-80">Does not meet criteria</span>
            </Button>
          </div>

          {/* Feedback Section (AC25: Templates) */}
          {decision && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  {decision === 'approve'
                    ? 'Verification Notes (Optional)'
                    : 'Feedback (Required)'}
                </label>
                {decision !== 'approve' && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {decision === 'revision'
                      ? 'Explain what needs to be improved and HOW to fix it. Be specific and supportive.'
                      : "Explain why this submission doesn't meet the criteria. Help the member understand what was missing."}
                  </p>
                )}

                {decision !== 'approve' && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Quick templates:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feedbackTemplates[decision].map((template, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setFeedback((prev) =>
                              prev ? prev + '\n\n' + template : template
                            )
                          }
                          className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                        >
                          {template.substring(0, 30)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    decision === 'approve'
                      ? 'Optional: Add any notes about this approval...'
                      : 'Provide detailed, constructive feedback (minimum 20 characters)...'
                  }
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {feedback.trim().length} characters
                  {decision !== 'approve' && feedback.trim().length < 20 && (
                    <span className="text-amber-600 ml-2">
                      (minimum 20 required)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmitReview}
              disabled={!decision || submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Submit Review</>
              )}
            </Button>

            <Button
              onClick={handleReleaseClaim}
              disabled={submitting || releasing}
              variant="outline"
            >
              {releasing ? 'Releasing...' : 'Release Claim'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
