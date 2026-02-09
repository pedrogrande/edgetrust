/**
 * Event Filter Component
 * Dropdown for filtering events by type
 * S1-06: Event Ledger UI
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EventTypeFilter } from '@/types/trust-builder';

interface EventFilterProps {
  currentFilter: EventTypeFilter;
  baseUrl: string;
}

export default function EventFilter({
  currentFilter,
  baseUrl,
}: EventFilterProps) {
  const handleFilterChange = (value: EventTypeFilter) => {
    window.location.href = `${baseUrl}?type=${value}`;
  };

  const getFilterLabel = (filter: EventTypeFilter): string => {
    switch (filter) {
      case 'all':
        return 'All Events';
      case 'claim':
        return 'Claim Events';
      case 'trust':
        return 'Trust Events';
      case 'member':
        return 'Member Events';
      default:
        return 'All Events';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="event-filter" className="text-sm font-medium">
        Filter by type:
      </label>
      <Select value={currentFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-[180px]" id="event-filter">
          <SelectValue placeholder={getFilterLabel(currentFilter)} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          <SelectItem value="claim">Claim Events</SelectItem>
          <SelectItem value="trust">Trust Events</SelectItem>
          <SelectItem value="member">Member Events</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
