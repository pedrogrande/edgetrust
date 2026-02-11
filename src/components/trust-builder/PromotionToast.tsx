/**
 * PromotionToast Component (S3-04)
 *
 * Displays congratulations message when member is promoted
 * AC11: Congratulations message on first dashboard visit after promotion
 */

'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X } from 'lucide-react';

interface PromotionToastProps {
  role: string;
  memberId: string;
}

export default function PromotionToast({
  role,
  memberId,
}: PromotionToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // AC11: Show congratulations only for Steward role promotion
    if (role === 'steward') {
      const storageKey = `steward_promo_seen_${memberId}`;
      const hasSeenPromotion = localStorage.getItem(storageKey);

      if (!hasSeenPromotion) {
        setVisible(true);
      }
    }
  }, [role, memberId]);

  const handleDismiss = () => {
    const storageKey = `steward_promo_seen_${memberId}`;
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <AlertTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🌟 Congratulations! You've earned the Steward role!
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p className="mb-2">
              You can now review claims from other members. Your role is to{' '}
              <strong>help them succeed</strong>, not to gatekeep.
            </p>
            <p className="text-sm">
              Visit the{' '}
              <a
                href="/trust-builder/review"
                className="underline hover:text-blue-600 dark:hover:text-blue-300"
              >
                Review Claims page
              </a>{' '}
              to get started.
            </p>
          </AlertDescription>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm p-1"
          aria-label="Dismiss congratulations message"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </Alert>
  );
}
