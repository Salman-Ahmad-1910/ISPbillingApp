'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { smartMatch } from '@/lib/search';

export interface DropdownItem {
  id: string;
  name: string;
  secondary?: string;
}

interface SearchableDropdownProps {
  label?: string;
  icon?: React.ElementType;
  items: DropdownItem[];
  value?: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  color?: string;
  allowClear?: boolean;
  className?: string;
}

export function SearchableDropdown({
  label,
  icon: Icon,
  items,
  value,
  onValueChange,
  placeholder,
  color,
  allowClear = true,
  className,
}: SearchableDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = items.find((i) => i.id === value);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter((i) => smartMatch(query, [i.id], [i.name, i.secondary]));
  }, [items, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`space-y-1 ${className || ''}`} ref={ref}>
      {label && (
        <Label className="text-xs font-medium flex items-center gap-1.5">
          {Icon && <Icon className={`h-3.5 w-3.5 ${color || ''}`} />}
          {label}
          {selected && <span className="text-muted-foreground font-normal ml-1">({selected.name})</span>}
        </Label>
      )}
      <div className="relative">
        <div
          className={`flex items-center border rounded-md transition-colors hover:border-foreground/30 ${open ? 'ring-2 ring-ring ring-offset-1' : ''}`}
        >
          <Search className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-sm h-9"
            placeholder={placeholder}
            value={selected && !open ? selected.name : query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {allowClear && value && (
            <button
              type="button"
              className="mr-2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onValueChange('');
                setQuery('');
                setOpen(false);
              }}
            >
              &times;
            </button>
          )}
        </div>
        {open && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm ${value === item.id ? 'bg-accent font-medium' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onValueChange(item.id);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span className="font-medium">{item.name}</span>
                {item.secondary && (
                  <span className="text-xs text-muted-foreground">{item.secondary}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {open && query && filtered.length === 0 && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}