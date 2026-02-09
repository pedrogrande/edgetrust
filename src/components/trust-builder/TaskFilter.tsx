/**
 * TaskFilter Component
 *
 * Mission dropdown filter for task list
 * Interactive component (requires client:load)
 */

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskFilterProps {
  missions: Array<{
    id: string;
    name: string;
  }>;
  selectedMissionId: string | null;
}

export function TaskFilter({ missions, selectedMissionId }: TaskFilterProps) {
  const [value, setValue] = useState(selectedMissionId || 'all');

  const handleChange = (newValue: string) => {
    setValue(newValue);

    const url = new URL(window.location.href);
    if (newValue === 'all') {
      url.searchParams.delete('mission');
    } else {
      url.searchParams.set('mission', newValue);
    }

    window.location.href = url.toString();
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="mission-filter" className="text-sm font-medium">
        Filter by Mission:
      </label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="mission-filter" className="w-[300px]">
          <SelectValue placeholder="All missions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All missions</SelectItem>
          {missions.map((mission) => (
            <SelectItem key={mission.id} value={mission.id}>
              {mission.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
