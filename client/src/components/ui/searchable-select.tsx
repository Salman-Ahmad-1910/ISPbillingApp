'use client';

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface SearchableSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: Array<{
    id: string;
    name: string;
    secondary?: string;
  }>;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  className?: string;
  allowClear?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Search and select...",
  searchPlaceholder = "Type to search...",
  label,
  className,
  allowClear = true,
}: SearchableSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.secondary?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue === '' ? null : newValue);
    setSearchTerm('');
  };

  const handleClear = () => {
    onValueChange(null);
    setSearchTerm('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      <Select value={value || ''} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 sticky top-0 bg-background border-b">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No options found</div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.name}</span>
                  {option.secondary && (
                    <span className="text-sm text-muted-foreground">
                      {option.secondary}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {allowClear && value && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="w-full"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Selection
        </Button>
      )}
    </div>
  );
}
