/**
 * Progress to Steward Component (S3-02)
 *
 * Shows progress bar toward next role milestone
 *
 * AC18: Progress bar shows percentage complete (e.g., "180/250 to Steward")
 * Celebrates achievement (sanctuary culture: positive framing)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressData {
  currentRole: string;
  nextRole: string | null;
  currentScore: number;
  targetScore: number | null;
  percentage: number;
}

interface ProgressToStewardProps {
  progress: ProgressData;
}

export default function ProgressToSteward({
  progress,
}: ProgressToStewardProps) {
  const { currentRole, nextRole, currentScore, targetScore, percentage } =
    progress;

  // If already at max role
  if (!nextRole || !targetScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {currentRole === 'guardian'
              ? '🏆 Guardian Status'
              : 'Role Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You've reached the{' '}
            {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} role!
            Continue contributing to strengthen the community.
          </p>
        </CardContent>
      </Card>
    );
  }

  const remainingPoints = targetScore - currentScore;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Progress to {nextRole.charAt(0).toUpperCase() + nextRole.slice(1)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AC18: Progress bar with percentage */}
        <div className="space-y-2">
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {currentScore} / {targetScore} points
            </span>
            <span className="font-semibold text-primary">
              {percentage}% complete
            </span>
          </div>
        </div>

        {/* Positive encouragement (sanctuary culture) */}
        <div className="pt-2">
          {percentage >= 75 ? (
            <p className="text-sm text-muted-foreground">
              🎉 You're almost there! Just {remainingPoints} more points to{' '}
              {nextRole}!
            </p>
          ) : percentage >= 50 ? (
            <p className="text-sm text-muted-foreground">
              Great progress! {remainingPoints} points to go for {nextRole}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keep contributing! Earn {remainingPoints} more points to reach{' '}
              {nextRole}.
            </p>
          )}
        </div>

        {/* Role benefits preview */}
        {nextRole === 'steward' && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Steward benefits:</strong> Review claims, mentor
              contributors, shape mission direction
            </p>
          </div>
        )}
        {nextRole === 'guardian' && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Guardian benefits:</strong> Approve missions, manage
              admins, guide platform evolution
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
