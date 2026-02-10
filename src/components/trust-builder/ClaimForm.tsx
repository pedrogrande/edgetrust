/**
 * Claim Submission Form
 * Collects proof text or file uploads for each task criterion
 *
 * Story: S2-03 - File Upload Proofs with SHA-256 Hashing
 */

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  FileText,
  Info,
} from 'lucide-react';
import { computeSHA256, formatHashForDisplay } from '@/lib/crypto/hash';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  proofType?: 'text' | 'file' | 'text_or_file'; // Added in S2-03
}

export function ClaimForm({
  taskId,
  taskTitle,
  criteria,
  proofType = 'text',
}: ClaimFormProps) {
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [fileProofs, setFileProofs] = useState<
    Record<
      string,
      {
        file: File;
        fileId?: string;
        fileUrl?: string;
        fileHash?: string;
        uploading?: boolean;
        uploaded?: boolean;
        error?: string;
      }
    >
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    points?: number;
  } | null>(null);

  const supportsFileUpload =
    proofType === 'file' || proofType === 'text_or_file';
  const requiresFileUpload = proofType === 'file';

  // Handle file selection with immediate upload
  const handleFileChange = async (
    criterionId: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (client-side check)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setFileProofs((prev) => ({
        ...prev,
        [criterionId]: {
          file,
          error:
            "This file is a bit too large--let's keep it under 10MB to ensure smooth sailing.",
        },
      }));
      return;
    }

    // Set uploading state
    setFileProofs((prev) => ({
      ...prev,
      [criterionId]: {
        file,
        uploading: true,
      },
    }));

    try {
      // Compute SHA-256 hash (show progress)
      const fileHash = await computeSHA256(file);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/trust-builder/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      // Update state with upload success
      setFileProofs((prev) => ({
        ...prev,
        [criterionId]: {
          file,
          fileId: data.file_id,
          fileUrl: data.file_url,
          fileHash: data.file_hash,
          uploaded: true,
          uploading: false,
        },
      }));
    } catch (err) {
      console.error('File upload error:', err);
      setFileProofs((prev) => ({
        ...prev,
        [criterionId]: {
          file,
          uploading: false,
          error:
            err instanceof Error
              ? err.message
              : 'Upload failed. Please try again.',
        },
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // Validate all proofs are provided
      const missingProofs = criteria.filter((c) => {
        const hasTextProof = proofs[c.id]?.trim();
        const hasFileProof = fileProofs[c.id]?.uploaded;

        if (requiresFileUpload) {
          return !hasFileProof;
        }

        if (supportsFileUpload) {
          return !hasTextProof && !hasFileProof;
        }

        return !hasTextProof;
      });

      if (missingProofs.length > 0) {
        setError(
          requiresFileUpload
            ? 'Please upload a file for each criterion'
            : 'Please provide proof for all criteria'
        );
        setIsSubmitting(false);
        return;
      }

      // Check for upload errors
      const uploadErrors = Object.values(fileProofs).filter((fp) => fp.error);
      if (uploadErrors.length > 0) {
        setError(
          'Some files have upload errors. Please fix them and try again.'
        );
        setIsSubmitting(false);
        return;
      }

      // Check if uploads are still in progress
      const uploadingFiles = Object.values(fileProofs).filter(
        (fp) => fp.uploading
      );
      if (uploadingFiles.length > 0) {
        setError('Please wait for file uploads to complete');
        setIsSubmitting(false);
        return;
      }

      // Validate text proof length (if text proofs are provided)
      if (!requiresFileUpload) {
        for (const criterion of criteria) {
          const proofText = proofs[criterion.id]?.trim();
          if (proofText && proofText.length < 10) {
            setError('Each text proof must be at least 10 characters long');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Build request payload
      const proofsArray = criteria.map((criterion) => {
        const fileProof = fileProofs[criterion.id];

        if (fileProof?.uploaded) {
          return {
            criterion_id: criterion.id,
            file_id: fileProof.fileId,
            file_hash: fileProof.fileHash,
          };
        }

        return {
          criterion_id: criterion.id,
          proof_text: proofs[criterion.id]?.trim() || '',
        };
      });

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
          {requiresFileUpload
            ? "Upload files to prove you've completed each criterion below."
            : "Provide evidence that you've completed each acceptance criterion below."}
        </p>
      </div>

      {criteria.map((criterion, index) => {
        const fileProof = fileProofs[criterion.id];

        return (
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

            {/* File Upload UI (if supported) */}
            {supportsFileUpload && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`file-${criterion.id}`}
                    className="text-sm font-normal"
                  >
                    {requiresFileUpload ? 'Upload proof:' : 'Or upload a file:'}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          <strong>Why do we hash your file?</strong>
                          <br />
                          When you upload proof, we compute a unique
                          "fingerprint" (SHA-256 hash) that mathematically
                          proves this exact file was submitted at this moment.
                          This fingerprint becomes part of your permanent record
                          and will enable Trust Builder to migrate your
                          contributions to blockchain storage in the
                          future--ensuring your work is truly yours, forever.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id={`file-${criterion.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,application/pdf,.docx,.txt"
                      onChange={(e) => handleFileChange(criterion.id, e)}
                      disabled={isSubmitting || fileProof?.uploading}
                      className="cursor-pointer"
                    />
                    {fileProof?.uploading && (
                      <span className="text-sm text-muted-foreground animate-pulse">
                        Computing fingerprint...
                      </span>
                    )}
                  </div>

                  {fileProof?.uploaded && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {fileProof.file.name} (
                        {(fileProof.file.size / 1024).toFixed(1)} KB)
                        {fileProof.fileHash && (
                          <span className="text-muted-foreground ml-2">
                            Fingerprint:{' '}
                            {formatHashForDisplay(fileProof.fileHash)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {fileProof?.error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {fileProof.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Upload an image (JPEG, PNG, GIF), PDF, document (DOCX), or
                  text file (max 10MB)
                </p>
              </div>
            )}

            {/* Text Proof UI (if not file-only) */}
            {!requiresFileUpload && (
              <Textarea
                id={`proof-${criterion.id}`}
                placeholder="Provide detailed evidence (minimum 10 characters)"
                value={proofs[criterion.id] || ''}
                onChange={(e) =>
                  setProofs({ ...proofs, [criterion.id]: e.target.value })
                }
                rows={4}
                required={!supportsFileUpload}
                minLength={10}
                disabled={isSubmitting}
                className="resize-y"
              />
            )}
          </div>
        );
      })}

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
