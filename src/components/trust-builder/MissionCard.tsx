/**
 * MissionCard Component
 *
 * Displays a mission summary card on the hub page
 * Static component (no client-side interactivity)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MissionCardProps {
  mission: {
    id: string;
    name: string;
    description: string | null;
    task_count: number;
    total_points_available: number;
  };
}

export function MissionCard({ mission }: MissionCardProps) {
  return (
    <a
      href={`/trust-builder/tasks?mission=${mission.id}`}
      className="block group"
    >
      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
        <CardHeader>
          <CardTitle className="group-hover:text-primary transition-colors">
            {mission.name}
          </CardTitle>
          {mission.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {mission.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {mission.task_count}
                </div>
                <div className="text-xs text-muted-foreground">
                  {mission.task_count === 1 ? 'Task' : 'Tasks'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {mission.total_points_available}
                </div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
