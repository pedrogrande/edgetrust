/**
 * Task Create Form Component
 * Guardian interface for creating draft tasks with criteria and incentives
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface Mission {
  id: string;
  name: string;
  description: string | null;
}

interface Incentive {
  id: string;
  name: string;
  description: string;
}

interface Criterion {
  description: string;
  proof_type: 'text' | 'url' | 'file';
  verification_method: 'auto_approve' | 'peer_review' | 'admin_review';
}

interface TaskIncentive {
  incentive_id: string;
  points: number;
}

interface Props {
  missions: Mission[];
  incentives: Incentive[];
}

export function TaskCreateForm({ missions, incentives }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Task fields
  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'simple' | 'complex'>('simple');
  const [verificationMethod, setVerificationMethod] = useState<
    'auto_approve' | 'peer_review' | 'admin_review'
  >('auto_approve');
  const [maxCompletions, setMaxCompletions] = useState('');

  // Criteria (at least one required)
  const [criteria, setCriteria] = useState<Criterion[]>([
    {
      description: '',
      proof_type: 'text',
      verification_method: 'auto_approve',
    },
  ]);

  // Incentives (at least one with points > 0 required)
  const [taskIncentives, setTaskIncentives] = useState<TaskIncentive[]>(
    incentives.map((inc) => ({ incentive_id: inc.id, points: 0 }))
  );

  const handleAddCriterion = () => {
    setCriteria([
      ...criteria,
      {
        description: '',
        proof_type: 'text',
        verification_method: verificationMethod,
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const handleCriterionChange = (
    index: number,
    field: keyof Criterion,
    value: string
  ) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleIncentiveChange = (incentiveId: string, points: number) => {
    const updated = taskIncentives.map((ti) =>
      ti.incentive_id === incentiveId ? { ...ti, points } : ti
    );
    setTaskIncentives(updated);
  };

  const totalPoints = taskIncentives.reduce((sum, ti) => sum + ti.points, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/trust-builder/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          title,
          rationale,
          description,
          task_type: taskType,
          verification_method: verificationMethod,
          max_completions: maxCompletions ? parseInt(maxCompletions) : null,
          criteria: criteria.map((c) => ({
            description: c.description,
            proof_type: c.proof_type,
            verification_method: c.verification_method,
          })),
          incentives: taskIncentives.filter((ti) => ti.points > 0),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task draft');
      }

      setSuccess(
        `Task draft created: "${data.task.title}". You can now publish it to make it visible to members.`
      );

      // Reset form
      setGroupId('');
      setTitle('');
      setRationale('');
      setDescription('');
      setMaxCompletions('');
      setCriteria([
        {
          description: '',
          proof_type: 'text',
          verification_method: 'auto_approve',
        },
      ]);
      setTaskIncentives(
        incentives.map((inc) => ({ incentive_id: inc.id, points: 0 }))
      );

      // Refresh task list
      window.dispatchEvent(new Event('task-created'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mission Selection */}
      <div className="space-y-2">
        <Label htmlFor="mission">Mission *</Label>
        <Select
          value={groupId}
          onValueChange={setGroupId}
          disabled={loading}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a mission" />
          </SelectTrigger>
          <SelectContent>
            {missions.map((mission) => (
              <SelectItem key={mission.id} value={mission.id}>
                {mission.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Tasks must belong to a Mission with specific goals.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Attend Live Webinar"
          disabled={loading}
          required
        />
      </div>

      {/* Rationale */}
      <div className="space-y-2">
        <Label htmlFor="rationale">Rationale</Label>
        <Textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this task important? What impact does it have?"
          rows={2}
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Helps members understand the purpose and value.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed instructions, context, or guidelines"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Task Type & Verification Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-type">Task Type *</Label>
          <Select
            value={taskType}
            onValueChange={(v) => setTaskType(v as 'simple' | 'complex')}
            disabled={loading}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="complex">Complex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verification">Verification Method *</Label>
          <Select
            value={verificationMethod}
            onValueChange={(v) =>
              setVerificationMethod(
                v as 'auto_approve' | 'peer_review' | 'admin_review'
              )
            }
            disabled={loading}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto_approve">Auto Approve</SelectItem>
              <SelectItem value="peer_review">Peer Review</SelectItem>
              <SelectItem value="admin_review">Admin Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max Completions */}
      <div className="space-y-2">
        <Label htmlFor="max-completions">Max Completions (optional)</Label>
        <Input
          id="max-completions"
          type="number"
          min="1"
          value={maxCompletions}
          onChange={(e) => setMaxCompletions(e.target.value)}
          placeholder="Leave empty for unlimited"
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Limits how many members can complete this task. Leave empty for
          unlimited.
        </p>
      </div>

      {/* Criteria */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Acceptance Criteria * (at least 1 required)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCriterion}
            disabled={loading}
          >
            Add Criterion
          </Button>
        </div>

        {criteria.map((criterion, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium">
                  Criterion {index + 1}
                </span>
                {criteria.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCriterion(index)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <Textarea
                value={criterion.description}
                onChange={(e) =>
                  handleCriterionChange(index, 'description', e.target.value)
                }
                placeholder="What must be done to satisfy this criterion?"
                rows={2}
                required
                disabled={loading}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Proof Type</Label>
                  <Select
                    value={criterion.proof_type}
                    onValueChange={(v) =>
                      handleCriterionChange(index, 'proof_type', v)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Verification</Label>
                  <Select
                    value={criterion.verification_method}
                    onValueChange={(v) =>
                      handleCriterionChange(index, 'verification_method', v)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_approve">Auto Approve</SelectItem>
                      <SelectItem value="peer_review">Peer Review</SelectItem>
                      <SelectItem value="admin_review">Admin Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incentives */}
      <div className="space-y-4">
        <Label>Incentive Points * (at least 1 point required)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incentives.map((incentive) => {
            const taskIncentive = taskIncentives.find(
              (ti) => ti.incentive_id === incentive.id
            );
            return (
              <div key={incentive.id} className="space-y-2">
                <Label
                  htmlFor={`incentive-${incentive.id}`}
                  className="text-sm font-medium"
                >
                  {incentive.name}
                </Label>
                <Input
                  id={`incentive-${incentive.id}`}
                  type="number"
                  min="0"
                  value={taskIncentive?.points || 0}
                  onChange={(e) =>
                    handleIncentiveChange(
                      incentive.id,
                      parseInt(e.target.value) || 0
                    )
                  }
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  {incentive.description}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-sm font-medium">
          Total Points: <span className="text-primary">{totalPoints}</span>
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Warning about publishing */}
      <Alert>
        <AlertDescription>
          <strong>Note:</strong> This will create a <strong>draft task</strong>.
          It is not visible to members yet. After reviewing, you can publish it
          below to make it visible.{' '}
          <strong>Once published, core fields cannot be changed.</strong>
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating Draft...' : 'Create Draft Task'}
      </Button>
    </form>
  );
}
