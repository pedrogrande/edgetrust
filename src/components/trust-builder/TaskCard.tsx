/**
 * TaskCard Component
 *
 * Displays a task summary card with mission, incentives, and total points
 * Static component (no client-side interactivity)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IncentiveBadge } from './IncentiveBadge';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    task_type: string;
    mission: {
      name: string;
    };
    incentives: Array<{
      name: string;
      points: number;
    }>;
    total_points: number;
  };
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <a href={`/trust-builder/tasks/${task.id}`} className="block group">
      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
              {task.title}
            </CardTitle>
            <Badge variant="outline" className="shrink-0 capitalize">
              {task.task_type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{task.mission.name}</p>
        </CardHeader>
        <CardContent>
          {task.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {task.incentives.map((incentive) => (
              <IncentiveBadge
                key={incentive.name}
                name={incentive.name}
                points={incentive.points}
              />
            ))}
          </div>

          <div className="font-semibold text-primary">
            {task.total_points} points total
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
