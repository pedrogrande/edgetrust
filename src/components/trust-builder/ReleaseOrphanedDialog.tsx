/**
 * S3-03: Release Orphaned Claims Dialog
 *
 * Confirmation dialog with sanctuary messaging (AC10, AC11, AC19)
 * Lists affected claims (title, reviewer, days orphaned)
 * Calls release endpoint on confirm (AC12, AC13)
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface OrphanedClaim {
  id: string;
  task_title: string;
  reviewer_name: string;
  days_orphaned: number;
}

interface ReleaseOrphanedDialogProps {
  orphanedClaims: OrphanedClaim[];
  timeoutDays: number;
}

export function ReleaseOrphanedDialog({
  orphanedClaims,
  timeoutDays,
}: ReleaseOrphanedDialogProps) {
  const { toast } = useToast();
  const [isReleasing, setIsReleasing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleRelease = async () => {
    setIsReleasing(true);

    try {
      const response = await fetch(
        '/api/trust-builder/admin/release-orphaned-claims',
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Release failed');
      }

      const { count } = await response.json();

      // AC12: Success toast message
      toast({
        title: 'Claims Released',
        description: `${count} claim${count !== 1 ? 's' : ''} released successfully. They're back in the queue for other reviewers.`,
      });

      // AC13: Page refreshes to show updated queue
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Release Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsReleasing(false);
      setIsOpen(false);
    }
  };

  // AC9: Only show button if orphaned claims exist
  if (orphanedClaims.length === 0) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          Release Orphaned Claims ({orphanedClaims.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Release {orphanedClaims.length} orphaned claim
            {orphanedClaims.length !== 1 ? 's' : ''}?
          </AlertDialogTitle>
          {/* AC11, AC19: Sanctuary culture messaging */}
          <AlertDialogDescription>
            Life happens! These claims have been under review for more than{' '}
            {timeoutDays}
            days and need fresh eyes. <strong>No penalties</strong> will be
            applied to reviewers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* AC10: List affected claims (title, reviewer, days orphaned) */}
        <div className="max-h-60 overflow-y-auto">
          <ul className="space-y-2">
            {orphanedClaims.slice(0, 20).map((claim) => (
              <li
                key={claim.id}
                className="text-sm border-l-2 border-yellow-500 pl-2"
              >
                <div className="font-medium">{claim.task_title}</div>
                <div className="text-muted-foreground">
                  Reviewer: {claim.reviewer_name} ·{' '}
                  {Math.floor(claim.days_orphaned)} days ago
                </div>
              </li>
            ))}
            {orphanedClaims.length > 20 && (
              <li className="text-sm text-muted-foreground italic">
                ...and {orphanedClaims.length - 20} more
              </li>
            )}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReleasing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRelease} disabled={isReleasing}>
            {isReleasing ? 'Releasing...' : 'Release Claims'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
