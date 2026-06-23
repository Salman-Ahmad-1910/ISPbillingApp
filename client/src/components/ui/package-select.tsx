'use client';

import ReactSelect from 'react-select';
import type { Package } from '@/lib/types';

interface PackageSelectProps {
  packages: Package[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PackageSelect({
  packages,
  value,
  onValueChange,
  placeholder = 'Select a package...',
  disabled = false,
}: PackageSelectProps) {
  const options = packages.map((pkg) => ({
    value: pkg.id,
    label: `${pkg.name} - PKR ${pkg.price.toLocaleString()}`,
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
      classNamePrefix="react-select"
    />
  );
}