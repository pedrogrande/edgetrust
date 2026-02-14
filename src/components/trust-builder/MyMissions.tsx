/**
 * MyMissions Component
 *
 * Dashboard widget showing missions the member has joined,
 * with task progress and quick navigation.
 *
 * Story: S4-04 (Mission Task Management)
 * AC14: Uses GET /missions/me API
 * AC15: Shows tasks_completed and tasks_available counts
 * AC23: Click navigates to mission detail page
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
import { Loader2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface Mission {
  id: string;
  stable_id: string;
  name: string;
  description: string;
  status: string;
  joined_at: string;
  tasks_available: number;
  tasks_completed: number;
}

export function MyMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMissions() {
      try {
        setLoading(true);
        const response = await fetch('/api/trust-builder/missions/me');
        const data = await response.json();

        if (response.ok) {
          setMissions(data.missions);
          setError(null);
        } else {
          setError(data.error || 'Failed to load missions');
        }
      } catch (err) {
        setError('Failed to load missions. Please try again.');
        console.error('Error fetching my missions:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMissions();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Missions</CardTitle>
          <CardDescription>Missions you've joined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading missions...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Missions</CardTitle>
          <CardDescription>Missions you've joined</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (missions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Missions</CardTitle>
          <CardDescription>Missions you've joined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You haven't joined any missions yet
            </p>
            <Button
              variant="default"
              onClick={() => {
                window.location.href = '/trust-builder/missions';
              }}
            >
              Browse Missions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Missions</CardTitle>
            <CardDescription>
              {missions.length} active mission{missions.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.href = '/trust-builder/missions';
            }}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                window.location.href = `/trust-builder/missions/${mission.id}`;
              }}
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm break-words">
                    {mission.name}
                  </h3>
                  <Badge
                    variant={
                      mission.status === 'active' ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {mission.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                  {mission.description}
                </p>
                {/* AC15: Show task progress */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{mission.tasks_completed} completed</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{mission.tasks_available} available</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
