'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 'active' = only active subscribers (the default), 'all' = every status. */
export type SubscriberStatusScope = 'active' | 'all';

interface SubscriberStatusFilterProps {
  value: SubscriberStatusScope;
  onChange: (value: SubscriberStatusScope) => void;
}

/**
 * Report filter: show only active subscribers (default) or subscribers of
 * every status (suspended, inactive, deactivated, expired ...).
 */
export function SubscriberStatusFilter({ value, onChange }: SubscriberStatusFilterProps) {
  return (
    <div className="space-y-2">
      <Label>Subscribers</Label>
      <Select value={value} onValueChange={(v) => onChange(v === 'all' ? 'all' : 'active')}>
        <SelectTrigger><SelectValue placeholder="Subscribers" /></SelectTrigger>
        <SelectContent portal={false}>
          <SelectItem value="active">Active only</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
