'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { DropdownItem } from './searchable-dropdown';

interface SearchableMultiSelectProps {
  label?: string;
  icon?: React.ElementType;
  items: DropdownItem[];
  values: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  color?: string;
  className?: string;
  emptyText?: string;
}

/**
 * Searchable dropdown that allows several items to be selected at once.
 * Selected items stay as removable chips below the search field.
 */
export function SearchableMultiSelect({
  label,
  icon: Icon,
  items,
  values,
  onChange,
  placeholder,
  color,
  className,
  emptyText = 'No items available',
}: SearchableMultiSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedItems = useMemo(
    () => values
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is DropdownItem => Boolean(item)),
    [items, values]
  );

  // Matches anywhere in the item so short queries (e.g. "al") still find staff.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.id, item.name, item.secondary].some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      )
    );
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

  const toggle = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((value) => value !== id));
    } else {
      onChange([...values, id]);
    }
  };

  return (
    <div className={`space-y-1 ${className || ''}`} ref={ref}>
      {label && (
        <Label className="text-xs font-medium flex items-center gap-1.5">
          {Icon && <Icon className={`h-3.5 w-3.5 ${color || ''}`} />}
          {label}
          <span className="text-muted-foreground font-normal">
            {values.length > 0 ? `(${values.length} selected)` : ''}
          </span>
        </Label>
      )}
      <div className="relative">
        <div
          className={`flex items-center border rounded-md transition-colors hover:border-foreground/30 ${open ? 'ring-2 ring-ring ring-offset-1' : ''}`}
        >
          <Search className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-sm h-9"
            placeholder={selectedItems.length > 0 ? 'Search to add more...' : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onMouseDown={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setQuery('');
              }
            }}
          />
          {values.length > 0 && (
            <button
              type="button"
              className="mr-2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Clear all"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
                setQuery('');
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {query ? 'No results found' : emptyText}
              </div>
            ) : (
              filtered.map((item) => {
                const checked = values.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm ${checked ? 'bg-accent/60' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(item.id);
                      setQuery('');
                    }}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40'}`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium truncate">{item.name}</span>
                      {item.secondary && (
                        <span className="text-xs text-muted-foreground truncate">{item.secondary}</span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        checked
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {checked ? 'Added' : 'Add'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {item.name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-emerald-200/60"
                title={`Remove ${item.name}`}
                onClick={() => toggle(item.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
