/**
 * RoleBadge Component (S3-04)
 *
 * Displays member role with appropriate styling and icon
 * AC8: Steward badge displayed for promoted members
 */

import { Badge } from '@/components/ui/badge';

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export default function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  // Role styling (Sanctuary culture: colors are positive, not hierarchical)
  const styles: Record<string, string> = {
    explorer: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
    contributor:
      'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
    steward: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
    guardian:
      'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
  };

  // Role icons (visual identity, not status symbols)
  const icons: Record<string, string> = {
    explorer: '🌱', // Growing, learning
    contributor: '✨', // Creating value
    steward: '🌟', // Helping others succeed
    guardian: '🛡️', // Protecting the community
  };

  const normalizedRole = role.toLowerCase();
  const style = styles[normalizedRole] || styles.explorer;
  const icon = icons[normalizedRole] || icons.explorer;

  return (
    <Badge className={`${style} ${className}`} aria-label={`Role: ${role}`}>
      <span className="mr-1" aria-hidden="true">
        {icon}
      </span>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
