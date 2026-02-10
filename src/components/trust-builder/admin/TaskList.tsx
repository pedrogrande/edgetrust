/**
 * Task List Component
 * Displays all tasks (including drafts) with publish action for Guardians
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Task {
  id: string;
  title: string;
  state: 'draft' | 'open' | 'in_progress' | 'complete' | 'expired' | 'cancelled';
  mission_name: string;
  creator_member_id: string;
  creator_display_name: string | null;
  criteria_count: number;
  total_points: number;
  created_at: string;
  published_at: string | null;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trust-builder/admin/tasks');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tasks');
      }

      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Listen for task-created event to refresh list
    const handleTaskCreated = () => fetchTasks();
    window.addEventListener('task-created', handleTaskCreated);

    return () => {
      window.removeEventListener('task-created', handleTaskCreated);
    };
  }, []);

  const handlePublish = async (taskId: string, taskTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to publish "${taskTitle}"?\n\nOnce published, this task becomes a contract. Title, criteria, and incentives cannot be changed.\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setPublishingId(taskId);
      setError('');

      const response = await fetch(`/api/trust-builder/admin/tasks/${taskId}/publish`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish task');
      }

      // Refresh task list
      await fetchTasks();
      alert(`Task "${taskTitle}" published successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPublishingId(null);
    }
  };

  const getStateBadge = (state: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      open: 'default',
      in_progress: 'outline',
      complete: 'outline',
      expired: 'destructive',
      cancelled: 'destructive',
    };

    return <Badge variant={variants[state] || 'default'}>{state.toUpperCase()}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks yet. Create your first task above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  {getStateBadge(task.state)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Mission: {task.mission_name} • Created by {task.creator_member_id}
                </div>
              </div>
              {task.state === 'draft' && (
                <Button
                  onClick={() => handlePublish(task.id, task.title)}
                  disabled={publishingId === task.id}
                  size="sm"
                >
                  {publishingId === task.id ? 'Publishing...' : 'Publish'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Criteria:</span>
                <br />
                <span className="font-medium">{task.criteria_count}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Points:</span>
                <br />
                <span className="font-medium">{task.total_points}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <br />
                <span className="font-medium">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </div>
              {task.published_at && (
                <div>
                  <span className="text-muted-foreground">Published:</span>
                  <br />
                  <span className="font-medium">
                    {new Date(task.published_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {task.state === 'draft' && (
              <Alert className="mt-4">
                <AlertDescription className="text-sm">
                  This task is in <strong>Draft</strong>. It is not visible to members yet. Review and publish when ready.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
