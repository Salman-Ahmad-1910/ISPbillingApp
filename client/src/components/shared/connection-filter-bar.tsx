'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConnectionFilterState, ConnectionFilterData } from '@/lib/connection-filters';

interface ConnectionFilterBarProps {
  filters: ConnectionFilterState;
  onChange: (key: keyof ConnectionFilterState, value: string) => void;
  data: ConnectionFilterData;
}

// Replicates the filter controls available on the subscriber-detail page.
export function ConnectionFilterBar({ filters, onChange, data }: ConnectionFilterBarProps) {
  const { areas, boxes, packages, companies } = data;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.sublocality} onValueChange={(v) => onChange('sublocality', v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sublocality" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sublocality</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>{area.subLocality || area.locality || area.id.slice(0, 8)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onChange('status', v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => onChange('type', v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="both">Both</SelectItem>
          <SelectItem value="tv_cable">TV Cable</SelectItem>
          <SelectItem value="cable_all">Cable All</SelectItem>
          <SelectItem value="internet">Internet</SelectItem>
          <SelectItem value="internet_all">Internet All</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.box} onValueChange={(v) => onChange('box', v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Box Number" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Boxes</SelectItem>
          {boxes.map((box) => (
            <SelectItem key={box.id} value={box.name}>{box.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.package} onValueChange={(v) => onChange('package', v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Package" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Packages</SelectItem>
          {packages.map((pkg) => (
            <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.discount} onValueChange={(v) => onChange('discount', v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Discount" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Discounts</SelectItem>
          <SelectItem value="no_discount">No Discount</SelectItem>
          <SelectItem value="quarter">Quarter</SelectItem>
          <SelectItem value="half">Half</SelectItem>
          <SelectItem value="full_free">Full Free</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sortBy} onValueChange={(v) => onChange('sortBy', v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Sort By" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Default</SelectItem>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="internetId">Internet ID</SelectItem>
          <SelectItem value="installationDate">Install Date</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.provider} onValueChange={(v) => onChange('provider', v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Connection Provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Providers</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.name}>{company.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
