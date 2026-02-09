/**
 * Claim Submission Form
 * Collects proof text for each task criterion
 */

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface Criterion {
  id: string;
  description: string;
  verification_method: string;
  sort_order: number;
}

interface ClaimFormProps {
  taskId: string;
  taskTitle: string;
  criteria: Criterion[];
}

export function ClaimForm({ taskId, taskTitle, criteria }: ClaimFormProps) {
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    points?: number;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // Validate all proofs are filled
      const missingProofs = criteria.filter((c) => !proofs[c.id]?.trim());
      if (missingProofs.length > 0) {
        setError('Please provide proof for all criteria');
        setIsSubmitting(false);
        return;
      }

      // Validate proof length
      for (const criterion of criteria) {
        const proofText = proofs[criterion.id]?.trim();
        if (proofText && proofText.length < 10) {
          setError('Each proof must be at least 10 characters long');
          setIsSubmitting(false);
          return;
        }
      }

      // Build request payload
      const proofsArray = criteria.map((criterion) => ({
        criterion_id: criterion.id,
        proof_text: proofs[criterion.id].trim(),
      }));

      // Submit claim
      const response = await fetch('/api/trust-builder/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          proofs: proofsArray,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          window.location.href = `/trust-builder/signin?redirect=/trust-builder/tasks/${taskId}/claim`;
          return;
        }

        if (response.status === 409) {
          setError(
            'You have already claimed this task. View your claims on your dashboard.'
          );
          setIsSubmitting(false);
          return;
        }

        if (response.status === 410) {
          setError(
            data.message ||
              'This task has reached its completion limit or is no longer accepting claims.'
          );
          setIsSubmitting(false);
          return;
        }

        setError(data.message || 'Failed to submit claim. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success!
      setSuccess({
        message: data.message,
        points: data.points_earned,
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = '/trust-builder/dashboard';
      }, 2000);
    } catch (err) {
      console.error('Claim submission error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertDescription className="ml-2">
          <p className="font-semibold text-green-900 dark:text-green-100">
            {success.message}
          </p>
          {success.points && (
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              You earned {success.points} points!
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting to your dashboard...
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{taskTitle}</h2>
        <p className="text-sm text-muted-foreground">
          Provide evidence that you've completed each acceptance criterion
          below.
        </p>
      </div>

      {criteria.map((criterion, index) => (
        <div key={criterion.id} className="space-y-2">
          <Label htmlFor={`proof-${criterion.id}`} className="text-base">
            Criterion {index + 1}
            <span className="text-muted-foreground font-normal ml-2">
              ({criterion.verification_method.replace('_', ' ')})
            </span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            {criterion.description}
          </p>
          <Textarea
            id={`proof-${criterion.id}`}
            placeholder="Provide detailed evidence (minimum 10 characters)"
            value={proofs[criterion.id] || ''}
            onChange={(e) =>
              setProofs({ ...proofs, [criterion.id]: e.target.value })
            }
            rows={4}
            required
            minLength={10}
            disabled={isSubmitting}
            className="resize-y"
          />
        </div>
      ))}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? 'Submitting...' : 'Submit Claim'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          onClick={() =>
            (window.location.href = `/trust-builder/tasks/${taskId}`)
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
