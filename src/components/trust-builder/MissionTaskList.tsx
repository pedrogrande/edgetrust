/**
 * MissionTaskList Component
 *
 * Displays mission-scoped tasks with claim status indicators.
 * Only visible to members who have joined the mission.
 *
 * Story: S4-04 (Mission Task Management)
 * AC10: Uses GET /missions/[id]/tasks API with authorization
 * AC11: Shows claim_status badges (unclaimed, claimed_by_me, claimed_by_other)
 * AC12: Navigates to /trust-builder/tasks/[id] on task click
 */

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
import { Loader2, CheckCircle2, Clock, Lock } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  state: string;
  task_type: string;
  max_completions: number;
  group_id: string;
  group_name: string;
  group_stable_id: string;
  claim_count: number;
  claim_status: 'unclaimed' | 'claimed_by_me' | 'claimed_by_other';
}

interface MissionTaskListProps {
  missionId: string;
}

export function MissionTaskList({ missionId }: MissionTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/trust-builder/missions/${missionId}/tasks`
        );
        const data = await response.json();

        if (response.ok) {
          setTasks(data.tasks);
          setIsMember(data.isMember);
          setError(null);
        } else if (response.status === 403) {
          // AC19: Not a member - show helpful message
          setIsMember(false);
          setError(data.message || 'Join this mission to view available tasks');
        } else {
          setError(data.error || 'Failed to load tasks');
        }
      } catch (err) {
        setError('Failed to load tasks. Please try again.');
        console.error('Error fetching mission tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [missionId]);

  // AC19: Non-member view
  if (!loading && !isMember) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Join this mission to start contributing and earning trust points!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading tasks...</span>
      </div>
    );
  }

  if (error && isMember) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // AC20: Empty state for members
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              No open tasks available
            </p>
            <p className="text-sm text-muted-foreground">
              Check back later for new opportunities to contribute!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // AC11: Render claim status badge
  const renderClaimStatusBadge = (status: Task['claim_status']) => {
    switch (status) {
      case 'unclaimed':
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" />
            Available
          </Badge>
        );
      case 'claimed_by_me':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Claimed by you
          </Badge>
        );
      case 'claimed_by_other':
        return (
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            Claimed
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg break-words">
                  {task.title}
                </CardTitle>
                <CardDescription className="mt-2 line-clamp-2">
                  {task.description}
                </CardDescription>
              </div>
              <div className="flex-shrink-0">
                {renderClaimStatusBadge(task.claim_status)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {task.max_completions === 1 ? (
                  <span>Single completion</span>
                ) : (
                  <span>
                    {task.claim_count} / {task.max_completions} completions
                  </span>
                )}
              </div>
              {/* AC12: Navigate to task detail */}
              <Button
                variant={
                  task.claim_status === 'unclaimed' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => {
                  window.location.href = `/trust-builder/tasks/${task.id}`;
                }}
              >
                {task.claim_status === 'claimed_by_me'
                  ? 'View Claim'
                  : 'View Task'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
