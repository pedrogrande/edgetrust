/**
 * MissionDetailView Component
 *
 * Mission detail page with tabbed navigation (Overview, Tasks, Members)
 *
 * Story: S4-04 (Mission Task Management)
 * AC21: Tab navigation for Overview/Tasks/Members
 * AC22: Tasks tab shows MissionTaskList component
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import { MissionTaskList } from './MissionTaskList';

interface Member {
  member_id: string;
  email: string;
  role: string;
  joined_at: string;
}

interface Mission {
  id: string;
  stable_id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  members: Member[];
  isMember: boolean;
}

interface MissionDetailViewProps {
  missionId: string;
}

export function MissionDetailView({ missionId }: MissionDetailViewProps) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchMission() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/trust-builder/missions/${missionId}`
        );
        const data = await response.json();

        if (response.ok) {
          setMission(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to load mission');
        }
      } catch (err) {
        setError('Failed to load mission. Please try again.');
        console.error('Error fetching mission:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMission();
  }, [missionId]);

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-lg text-muted-foreground">
            Loading mission...
          </span>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-center">
              {error || 'Mission not found'}
            </p>
            <div className="text-center mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = '/trust-builder/missions')
                }
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Missions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = '/trust-builder/missions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Missions
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight break-words">
            {mission.name}
          </h1>
          <p className="text-muted-foreground mt-2">{mission.stable_id}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant={mission.status === 'active' ? 'default' : 'secondary'}
          >
            {mission.status}
          </Badge>
          {mission.isMember && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              Member
            </Badge>
          )}
        </div>
      </div>

      {/* AC21: Tabbed interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About this Mission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{mission.description}</p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(mission.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Members:</span>{' '}
                  {mission.members.length}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AC22: Tasks Tab with MissionTaskList */}
        <TabsContent value="tasks" className="space-y-4">
          <MissionTaskList missionId={missionId} />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mission Members ({mission.members.length})</CardTitle>
              <CardDescription>
                Active contributors to this mission
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mission.members.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No members yet. Be the first to join!
                </p>
              ) : (
                <div className="space-y-3">
                  {mission.members.map((member) => (
                    <div
                      key={member.member_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm break-all">
                          {member.member_id}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{member.role}</Badge>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Joined{' '}
                          {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
