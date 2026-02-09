/**
 * Success Alert Component
 * Shows claim approval success message with auto-dismiss
 */

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessAlertProps {
  points: string | null;
}

export default function SuccessAlert({ points }: SuccessAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <span className="font-semibold">Claim approved!</span> You earned{' '}
            <span className="font-bold">{points || '0'} points</span>.
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-700 dark:text-green-400"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
}
