/**
 * IncentiveBadge Component
 *
 * Displays a single incentive dimension as a colored badge
 * Maps to the 5 canonical incentive types
 */

import { Badge } from '@/components/ui/badge';
import { IncentiveDimension } from '@/types/trust-builder';

interface IncentiveBadgeProps {
  name: string;
  points: number;
}

// Color mapping for the 5 dimensions
const dimensionColors: Record<string, string> = {
  [IncentiveDimension.PARTICIPATION]: 'bg-blue-500 hover:bg-blue-600',
  [IncentiveDimension.COLLABORATION]: 'bg-green-500 hover:bg-green-600',
  [IncentiveDimension.INNOVATION]: 'bg-purple-500 hover:bg-purple-600',
  [IncentiveDimension.LEADERSHIP]: 'bg-orange-500 hover:bg-orange-600',
  [IncentiveDimension.IMPACT]: 'bg-red-500 hover:bg-red-600',
};

export function IncentiveBadge({ name, points }: IncentiveBadgeProps) {
  const normalizedName = name.toLowerCase();
  const colorClass =
    dimensionColors[normalizedName] || 'bg-gray-500 hover:bg-gray-600';

  return (
    <Badge variant="default" className={`${colorClass} text-white border-none`}>
      {name} {points}
    </Badge>
  );
}
