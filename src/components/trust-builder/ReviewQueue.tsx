/**
 * ReviewQueue Component
 *
 * Displays claims awaiting peer review
 * AC22: Includes sanctuary culture reminder
 * AC27: Shows workload tracking (max 3 active reviews)
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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!queueData) return null;

  return (
    <div className="space-y-6">
      {/* Workload Indicator (AC27) */}
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
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Please complete or release a review before claiming another.
            </p>
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

      {/* Queue List */}
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
          {queueData.claims.map((claim) => (
            <Card
              key={claim.id}
              className="hover:border-primary transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {claim.taskTitle}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {claim.taskDescription}
                    </CardDescription>
                  </div>
                  {claim.revisionCount > 0 && (
                    <Badge variant="secondary" className="ml-4">
                      Revision {claim.revisionCount}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Member Info (AC26: effort indicators) */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {claim.memberDisplayName}
                      </span>
                      <span className="text-xs">
                        ({claim.memberIdentifier})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Trust Score:</span>
                      <span className="font-medium">
                        {claim.memberTrustScore}
                      </span>
                    </div>
                  </div>

                  {/* Submission Details */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Submitted {formatTimeAgo(claim.submittedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>
                        {claim.proofCount} proof
                        {claim.proofCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button
                      onClick={() => handleAssignClaim(claim.id)}
                      disabled={
                        !queueData.canReviewMore ||
                        assigningClaimId === claim.id
                      }
                      className="w-full sm:w-auto"
                    >
                      {assigningClaimId === claim.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        'Review This Claim'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
