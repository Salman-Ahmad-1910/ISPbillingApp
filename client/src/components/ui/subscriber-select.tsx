'use client';

import ReactSelect from 'react-select';
import type { Subscriber } from '@/lib/types';
import { smartMatch } from '@/lib/search';

interface SubscriberSelectProps {
  subscribers: Subscriber[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SubscriberSelect({
  subscribers,
  value,
  onValueChange,
  placeholder = 'Select a subscriber...',
  disabled = false,
}: SubscriberSelectProps) {
  const options = subscribers.map((subscriber) => ({
    ...subscriber,
    value: subscriber.id,
    label: `${subscriber.subscriber_identity || ''} | ${subscriber.name || ''}`,
  }));

  const selectedOption =
    options.find((option) => option.value === value) || null;

  return (
    <ReactSelect
      options={options}
      value={selectedOption}
      onChange={(option) => onValueChange(option?.value || '')}
      placeholder={placeholder}
      isDisabled={disabled}
      isSearchable
      filterOption={(option, rawInput) => {
        const d = option.data as Subscriber;
        return smartMatch(rawInput, [d.subscriber_identity, d.id, d.cnic, d.phone], [d.name]);
      }}
      classNamePrefix="react-select"
    />
  );
}