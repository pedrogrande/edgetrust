/**
 * S3-03: Orphaned Claims Badge
 *
 * Displays count of claims orphaned (configurable timeout from system_config)
 * Fetches count on mount, updates on page refresh
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function OrphanedClaimsBadge() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trust-builder/admin/orphaned-claims-count')
      .then((res) => res.json())
      .then((data) => setCount(data.count || 0))
      .catch((err) => console.error('Failed to fetch orphaned count:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // AC9: Only show if count > 0
  if (isLoading || count === 0) return null;

  return (
    <Badge variant="destructive" className="ml-2">
      {count} orphaned
    </Badge>
  );
}
