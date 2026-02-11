/**
 * Claim History Table Component (S3-02)
 *
 * Displays member's claims with task context, status badges, and points
 *
 * AC5: Claim history table shows all member's claims
 * AC6: Clicking claim row navigates to detail page (placeholder link OK)
 * AC19: Status badges color-coded
 * AC21-22: Keyboard navigable
 * AC25: Color contrast meets WCAG 2.1 AA (≥4.5:1) - CRITICAL for strategic review
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ClaimHistoryItem {
  id: string;
  taskTitle: string;
  missionName: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  incentives: Array<{
    name: string;
    points: number;
  }>;
}

interface ClaimHistoryTableProps {
  claims: ClaimHistoryItem[];
}

export default function ClaimHistoryTable({ claims }: ClaimHistoryTableProps) {
  // AC19: Status badge colors (strategic review HIGH priority - validate contrast)
  // AC25: WCAG 2.1 AA contrast ratio ≥4.5:1
  // Updated from text-*-800 to text-*-900 for better contrast
  const statusColors: Record<string, string> = {
    submitted:
      'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300',
    under_review:
      'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300',
    approved:
      'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300',
    revision_requested:
      'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-300',
    rejected: 'bg-red-100 text-red-900 dark:bg-red-900/20 dark:text-red-300',
  };

  // AC20: Empty state for new members
  if (claims.length === 0) {
    return (
      <div
        className="text-center py-12 bg-card rounded-lg border"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-lg font-medium">Welcome to your dashboard!</p>
          <p className="text-muted-foreground">
            Your Trust Score will appear here after your first task completion.
          </p>
          <a
            href="/trust-builder/tasks"
            className="inline-flex items-center text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-2"
          >
            Browse available tasks →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Task</TableHead>
            <TableHead className="w-[20%]">Mission</TableHead>
            <TableHead className="w-[15%]">Status</TableHead>
            <TableHead className="w-[15%]">Submitted</TableHead>
            <TableHead className="w-[10%] text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => {
            const totalPoints = claim.incentives.reduce(
              (sum, i) => sum + i.points,
              0
            );
            const statusKey = claim.status.toLowerCase().replace(' ', '_');
            const badgeClass =
              statusColors[statusKey] || statusColors.submitted;

            return (
              <TableRow
                key={claim.id}
                className="cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50"
                onClick={() => {
                  // AC6: Navigate to claim detail (future story, placeholder OK)
                  window.location.href = `/trust-builder/claims/${claim.id}`;
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.location.href = `/trust-builder/claims/${claim.id}`;
                  }
                }}
                role="button"
                aria-label={`View claim for ${claim.taskTitle}`}
              >
                <TableCell className="font-medium">{claim.taskTitle}</TableCell>
                <TableCell className="text-muted-foreground">
                  {claim.missionName}
                </TableCell>
                <TableCell>
                  <Badge className={badgeClass}>
                    {claim.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(claim.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {claim.status === 'approved' ? totalPoints : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* AC28: Pagination note (Load More button) */}
      {claims.length >= 20 && (
        <div className="p-4 text-center border-t">
          <button
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => {
              // Future: Implement cursor-based pagination
              console.log('Load more claims');
            }}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
