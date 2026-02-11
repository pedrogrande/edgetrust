/**
 * Trust Score Card Component (S3-02)
 * Displays member's total Trust Score prominently
 *
 * AC1: Dashboard displays member's Trust Score inom 2s page load
 * AC12: Member role displayed correctly (badge)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TrustScoreCardProps {
  trustScore: number;
  role: string;
}

export default function TrustScoreCard({
  trustScore,
  role,
}: TrustScoreCardProps) {
  // Map roles to badge colors
  const roleColors: Record<string, string> = {
    explorer:
      'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400',
    contributor:
      'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-400',
    steward:
      'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400',
    guardian:
      'bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-400',
  };

  const roleBadgeClass = roleColors[role.toLowerCase()] || roleColors.explorer;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Trust Score</CardTitle>
            <div className="mt-2">
              <Badge className={roleBadgeClass}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-5xl font-bold text-primary"
              aria-label={`Your Trust Score is ${trustScore} points`}
            >
              {trustScore}
            </div>
            <div className="text-sm text-muted-foreground mt-1">points</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Your Trust Score is earned through verified contributions across 5
          dimensions: Participation, Collaboration, Innovation, Leadership, and
          Impact.
        </p>
      </CardContent>
    </Card>
  );
}
