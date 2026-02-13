/**
 * ReviewQueue Component
 *
 * Displays claims awaiting peer review
 * AC22: Includes sanctuary culture reminder
 * AC27: Shows workload tracking (max 3 active reviews)
 *
 * S4-05: Layout improvements applied
 * - Primary action clarity (AC1): "Start Review" button prominence
 * - Visual grouping (AC2): Metadata grouped in clear sections
 * - Information hierarchy (AC3): Key info above fold
 * - Mobile responsive (AC4): Full-width buttons, proper touch targets
 * - Sanctuary spacing (AC5): Comfortable spacing, warning alerts
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Clock, FileText } from 'lucide-react';

interface QueueClaim {
  id: string;
  memberId: string;
  memberDisplayName: string;
  memberIdentifier: string;
  memberTrustScore: number;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  submittedAt: string;
  revisionCount: number;
  proofCount: number;
}

interface QueueData {
  claims: QueueClaim[];
  queueDepth: number;
  activeReviewCount: number;
  maxActiveReviews: number;
  canReviewMore: boolean;
}

export default function ReviewQueue({ userId }: { userId: string }) {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningClaimId, setAssigningClaimId] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/trust-builder/reviews/queue');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load review queue');
      }

      const data = await response.json();
      setQueueData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAssignClaim = async (claimId: string) => {
    try {
      setAssigningClaimId(claimId);

      const response = await fetch(
        `/api/trust-builder/reviews/${claimId}/assign`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign claim');
      }

      // Navigate to review page
      window.location.href = `/trust-builder/reviews/${claimId}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
      setAssigningClaimId(null);
      loadQueue(); // Refresh queue
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Calculate days pending for sanctuary-aligned badge display (SHOULD item #1)
  const calculateDaysPending = (submittedAt: string) => {
    const date = new Date(submittedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Sanctuary-aligned badge variant based on days pending (SHOULD item #1)
  const getBadgeVariant = (days: number): "default" | "secondary" | "destructive" => {
    if (days >= 7) return 'destructive';  // Urgent: >7 days
    if (days >= 5) return 'default';      // Attention needed: 5-6 days
    return 'secondary';                    // Normal: <5 days
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">
          Loading review queue...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!queueData) return null;

  return (
    <div className="space-y-6">
      {/* Workload Indicator (AC27) - Enhanced with sanctuary spacing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Review Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {queueData.activeReviewCount} / {queueData.maxActiveReviews}
              </p>
              <p className="text-sm text-muted-foreground">Active reviews</p>
            </div>
            {queueData.canReviewMore ? (
              <Badge variant="default">Ready to review</Badge>
            ) : (
              <Badge variant="destructive">At capacity</Badge>
            )}
          </div>
          {!queueData.canReviewMore && (
            <Alert variant="default" className="mt-4">
              <AlertDescription>
                Please complete or release a review before claiming another.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Queue Stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Claims Awaiting Review ({queueData.queueDepth})
        </h2>
        <Button variant="outline" size="sm" onClick={loadQueue}>
          Refresh Queue
        </Button>
      </div>

      {/* Queue List - S4-05 Layout Improvements Applied */}
      {queueData.claims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No claims awaiting review at this time. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {queueData.claims.map((claim) => {
            const daysPending = calculateDaysPending(claim.submittedAt);
            
            return (
              <Card
                key={claim.id}
                className="cursor-pointer transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAssignClaim(claim.id);
                  }
                }}
              >
                <CardContent className="pt-6 space-y-4">
                  {/* AC2 & AC3: Grouped Metadata with Information Hierarchy */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{claim.taskTitle}</h3>
                      <div className="flex items-center gap-2">
                        {/* Days Pending Badge (AC3: key info above fold) */}
                        <Badge variant={getBadgeVariant(daysPending)}>
                          {daysPending}d
                        </Badge>
                        {/* SHOULD item #4: Proof count in header */}
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {claim.proofCount}
                        </Badge>
                        {/* Revision indicator */}
                        {claim.revisionCount > 0 && (
                          <Badge variant="secondary">
                            Rev {claim.revisionCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Member info grouped */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium">
                        {claim.memberDisplayName}
                      </span>
                      <span className="text-xs">
                        ({claim.memberIdentifier})
                      </span>
                      <span>Trust Score: {claim.memberTrustScore}</span>
                    </div>
                    
                    {/* Submission timestamp */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Submitted {formatTimeAgo(claim.submittedAt)}</span>
                    </div>
                    
                    {/* Task description (below fold acceptable per AC3) */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {claim.taskDescription}
                    </p>
                  </div>

                  {/* AC5: Sanctuary-aligned warning for pending claims */}
                  {daysPending >= 5 && (
                    <Alert variant="default" className="mt-4">
                      <AlertDescription>
                        This claim has been pending for {daysPending} days. The member is waiting for your feedback!
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* AC1: Primary Action - ONE clear "Start Review" button */}
                  <div className="pt-2">
                    <Button
                      variant="default"
                      className="w-full min-h-[44px]"
                      onClick={() => handleAssignClaim(claim.id)}
                      disabled={
                        !queueData.canReviewMore ||
                        assigningClaimId === claim.id
                      }
                    >
                      {assigningClaimId === claim.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        'Start Review'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}