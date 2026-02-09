/**
 * Claim Card Component
 * Displays individual claim with task, mission, status, and points
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface ClaimCardProps {
  claimId: string;
  taskTitle: string;
  missionName: string;
  status: 'submitted' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt: Date | null;
  pointsEarned: number;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle2,
        label: 'Approved',
        className:
          'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      };
    case 'submitted':
      return {
        icon: Clock,
        label: 'Pending Review',
        className:
          'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      };
    case 'rejected':
      return {
        icon: XCircle,
        label: 'Rejected',
        className:
          'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      };
    default:
      return {
        icon: Clock,
        label: status,
        className:
          'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
      };
  }
}

export default function ClaimCard({
  claimId,
  taskTitle,
  missionName,
  status,
  submittedAt,
  reviewedAt,
  pointsEarned,
}: ClaimCardProps) {
  const statusBadge = getStatusBadge(status);
  const StatusIcon = statusBadge.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 truncate">
              {taskTitle}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Mission: {missionName}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={statusBadge.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusBadge.label}
              </Badge>

              <span className="text-xs text-muted-foreground">
                Submitted {formatRelativeTime(submittedAt)}
              </span>
            </div>

            {status === 'approved' && reviewedAt && (
              <p className="text-sm text-muted-foreground mt-2">
                Approved {formatRelativeTime(reviewedAt)}
              </p>
            )}

            {status === 'submitted' && (
              <p className="text-sm text-muted-foreground mt-2">
                A reviewer will evaluate your work soon
              </p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            {status === 'approved' ? (
              <>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{pointsEarned}
                </div>
                <div className="text-xs text-muted-foreground">points</div>
              </>
            ) : status === 'submitted' ? (
              <>
                <div className="text-lg font-semibold text-muted-foreground">
                  {pointsEarned}
                </div>
                <div className="text-xs text-muted-foreground">pts pending</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">0 points</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
