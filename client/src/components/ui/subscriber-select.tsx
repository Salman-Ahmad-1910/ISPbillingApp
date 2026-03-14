'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Subscriber } from '@/lib/types';

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
  placeholder = "Select a subscriber...",
  disabled = false
}: SubscriberSelectProps) {
  const [open, setOpen] = useState(false);

  // Filter and sort subscribers based on search
  const filteredSubscribers = useMemo(() => {
    return subscribers.map(subscriber => ({
      ...subscriber,
      displayName: `${subscriber.subscriber_identity || ''} | ${subscriber.name || ''}`.trim(),
    }));
  }, [subscribers]);

  const selectedSubscriber = useMemo(() => {
    return filteredSubscribers.find(subscriber => subscriber.id === value);
  }, [filteredSubscribers, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedSubscriber ? selectedSubscriber.displayName : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search by subscriber ID or name..." />
          <CommandEmpty>No subscriber found.</CommandEmpty>
          <CommandGroup>
            {filteredSubscribers.map((subscriber) => (
              <CommandItem
                key={subscriber.id}
                value={subscriber.displayName}
                onSelect={() => {
                  onValueChange(subscriber.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    subscriber.id === value ? "opacity-100" : "opacity-0"
                  )}
                />
                {subscriber.displayName}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
