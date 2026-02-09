/**
 * Event Card Component
 * Displays individual event from immutable ledger
 * S1-06: Event Ledger UI
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useState } from 'react';
import type { Event } from '@/types/trust-builder';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getEventBadge = (eventType: string) => {
    if (eventType.startsWith('claim.')) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600">Claim Event</Badge>
      );
    }
    if (eventType.startsWith('trust.')) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">Trust Event</Badge>
      );
    }
    if (eventType.startsWith('member.')) {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600">
          Member Event
        </Badge>
      );
    }
    if (eventType.startsWith('task.')) {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600">Task Event</Badge>
      );
    }
    return <Badge>{eventType}</Badge>;
  };

  const formatRelativeTime = (date: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(date).toLocaleDateString();
  };

  const getEventDescription = (event: Event): string => {
    switch (event.event_type) {
      case 'member.created':
        return 'You joined Trust Builder';
      case 'claim.submitted':
        return 'Submitted claim on task';
      case 'claim.approved':
        return `Claim approved • Earned ${event.metadata.points_earned || 0} points`;
      case 'claim.rejected':
        return 'Claim rejected';
      case 'trust.updated':
        const pointsAdded = event.metadata.points_added || 0;
        return `Trust score updated • ${pointsAdded > 0 ? '+' : ''}${pointsAdded} points`;
      default:
        return event.event_type;
    }
  };

  const copyMetadata = () => {
    navigator.clipboard.writeText(JSON.stringify(event.metadata, null, 2));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getEventBadge(event.event_type)}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span title={new Date(event.timestamp).toISOString()}>
                  {formatRelativeTime(event.timestamp)}
                </span>
              </span>
            </div>
            <p className="text-sm font-medium">{getEventDescription(event)}</p>
            {event.entity_type && (
              <p className="text-xs text-muted-foreground mt-1">
                {event.entity_type}: {event.entity_id.substring(0, 8)}...
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Event Metadata
              </h4>
              <Button variant="ghost" size="sm" onClick={copyMetadata}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
              <code>{JSON.stringify(event.metadata, null, 2)}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
