/**
 * TaskList Component
 *
 * Container for displaying a grid of task cards
 * Static component (no client-side interactivity)
 */

import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Array<{
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
  }>;
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No tasks available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
