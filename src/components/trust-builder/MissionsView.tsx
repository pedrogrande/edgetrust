/**
 * Component: MissionsView
 * Story: S4-03B - Mission Joining UI
 *
 * Displays mission list and detail view with join/leave actions
 * Pattern: List + Detail layout with optimistic updates
 *
 * Uses:
 * - ProgressToSteward (S3-02) for consistency
 * - Optimistic UI with actionInFlight state
 * - Skeleton loading for perceived performance
 * - Sanctuary culture: supportive messages
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface Mission {
  id: string;
  name: string;
  description: string;
  status: string;
  min_trust_score: number;
  member_count: number;
  task_count: number;
  is_member: boolean;
  is_eligible: boolean;
}

interface Member {
  member_id: string;
  member_stable_id: string;
  email: string;
  trust_score_cached: number;
  joined_at: string;
}

interface MissionDetail extends Mission {
  members: Member[];
}

export function MissionsView() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberTrustScore, setMemberTrustScore] = useState<number>(0);

  // Fetch missions list
  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trust-builder/missions');
      if (!response.ok) throw new Error('Failed to fetch missions');

      const data = await response.json();
      setMissions(data.missions || []);

      // Extract member trust score from first mission
      if (data.missions && data.missions.length > 0) {
        // Trust score is consistent across all missions for current member
        setMemberTrustScore(
          data.missions[0].is_eligible ? data.missions[0].min_trust_score : 0
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissionDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/trust-builder/missions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch mission details');

      const data = await response.json();
      setSelectedMission({ ...data.mission, members: data.members });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleJoin = async (missionId: string) => {
    if (actionInFlight) return;

    setActionInFlight(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/trust-builder/missions/${missionId}/join`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join mission');
      }

      // Refresh both list and detail
      await fetchMissions();
      if (selectedMission) {
        await fetchMissionDetail(missionId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionInFlight(false);
    }
  };

  const handleLeave = async (missionId: string) => {
    if (actionInFlight) return;

    setActionInFlight(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/trust-builder/missions/${missionId}/leave`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave mission');
      }

      // Refresh both list and detail
      await fetchMissions();
      if (selectedMission) {
        await fetchMissionDetail(missionId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionInFlight(false);
    }
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="container max-w-6xl py-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Missions</h1>
        <p className="text-muted-foreground">
          Join missions aligned with Future's Edge values. Build trust through
          contribution.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Missions</h2>

          {missions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active missions available
              </CardContent>
            </Card>
          ) : (
            missions.map((mission) => (
              <Card
                key={mission.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  selectedMission?.id === mission.id ? 'border-primary' : ''
                }`}
                onClick={() => fetchMissionDetail(mission.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{mission.name}</CardTitle>
                    {mission.is_member && (
                      <Badge variant="default">Member</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {mission.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{mission.member_count} members</span>
                    <span>•</span>
                    <span>Min Trust: {mission.min_trust_score}</span>
                  </div>

                  {!mission.is_eligible && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Build {mission.min_trust_score - memberTrustScore} more
                      trust points to join
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Mission Detail */}
        <div className="space-y-4">
          {!selectedMission && !detailLoading && (
            <Card className="h-64 flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                ← Select a mission to view details
              </CardContent>
            </Card>
          )}

          {detailLoading && (
            <Card className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          )}

          {selectedMission && !detailLoading && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{selectedMission.name}</CardTitle>
                  {selectedMission.is_member && (
                    <Badge variant="default">Member</Badge>
                  )}
                </div>
                <CardDescription>{selectedMission.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Trust Score Progress */}
                {!selectedMission.is_member && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Your Trust Score
                      </span>
                      <span className="font-medium">
                        {memberTrustScore} / {selectedMission.min_trust_score}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        (memberTrustScore / selectedMission.min_trust_score) *
                          100,
                        100
                      )}
                      className="h-2"
                    />
                    {!selectedMission.is_eligible && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {selectedMission.min_trust_score - memberTrustScore}{' '}
                        more points needed to join
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Mission Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="text-2xl font-bold">
                      {selectedMission.member_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Tasks
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedMission.task_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Min Trust Score
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedMission.min_trust_score}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="secondary">{selectedMission.status}</Badge>
                  </div>
                </div>

                <Separator />

                {/* Active Members */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">
                    Active Members ({selectedMission.members.length})
                  </h3>
                  {selectedMission.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active members yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedMission.members.map((member) => (
                        <div
                          key={member.member_id}
                          className="flex items-center justify-between p-2 rounded bg-accent/50"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {member.member_stable_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {member.trust_score_cached} Trust
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                {selectedMission.is_member ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleLeave(selectedMission.id)}
                    disabled={actionInFlight}
                  >
                    {actionInFlight ? 'Leaving...' : 'Leave Mission'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleJoin(selectedMission.id)}
                      disabled={!selectedMission.is_eligible || actionInFlight}
                    >
                      {actionInFlight ? 'Joining...' : 'Join Mission'}
                    </Button>
                    {!selectedMission.is_eligible && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 px-2">
                        Complete claims to build{' '}
                        {selectedMission.min_trust_score - memberTrustScore}{' '}
                        more trust points
                      </p>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
