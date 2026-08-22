import type { Area, DistributionBox, Package, Company, Connection } from '@/lib/types';
import { smartMatch } from '@/lib/search';

export interface ConnectionFilterState {
  sublocality: string;
  status: string;
  type: string;
  box: string;
  package: string;
  discount: string;
  sortBy: string;
  provider: string;
}

export const defaultConnectionFilters = (): ConnectionFilterState => ({
  sublocality: 'all',
  status: 'all',
  type: 'all',
  box: 'all',
  package: 'all',
  discount: 'all',
  sortBy: 'all',
  provider: 'all',
});

// Mirrors the filtering logic used on the subscriber-detail page.
export function applyConnectionFilters(
  connections: Connection[],
  filters: ConnectionFilterState,
  search: string,
): Connection[] {
  let result = connections;

  if (search) {
    result = result.filter(c =>
      smartMatch(search, [c.internetId, c.cell, c.mobile], [c.name, c.address]),
    );
  }

  if (filters.sublocality !== 'all') {
    result = result.filter(c => c.sublocalityId === filters.sublocality);
  }
  if (filters.status !== 'all') {
    result = result.filter(c => c.status === filters.status);
  }
  if (filters.type !== 'all') {
    const typeMap: Record<string, string> = {
      both: 'both',
      tv_cable: 'tv_cable',
      internet: 'internet',
      cable_all: 'tv_cable',
      internet_all: 'internet',
    };
    result = result.filter(c => c.connectionType === (typeMap[filters.type] || filters.type));
  }
  if (filters.box !== 'all') {
    result = result.filter(c => c.boxNumber === filters.box);
  }
  if (filters.package !== 'all') {
    result = result.filter(c => c.packageInternet === filters.package || c.packageCable === filters.package);
  }
  if (filters.discount !== 'all') {
    result = result.filter(c => c.discount === filters.discount || (filters.discount === 'no_discount' && !c.discount));
  }
  if (filters.provider !== 'all') {
    result = result.filter(c => c.connectionProvider === filters.provider);
  }

  if (filters.sortBy === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name));
  } else if (filters.sortBy === 'internetId') {
    result = [...result].sort((a, b) => a.internetId.localeCompare(b.internetId));
  } else if (filters.sortBy === 'installationDate') {
    result = [...result].sort((a, b) => (a.installationDate || '').localeCompare(b.installationDate || ''));
  }

  return result;
}

export interface ConnectionFilterData {
  areas: Area[];
  boxes: DistributionBox[];
  packages: Package[];
  companies: Company[];
}

// Cycle-start date used for the From/To filters on the collection pages:
// last payment, falling back to recharge date, then creation date.
function connectionCycleStart(c: Connection): string {
  return c.lastPaymentDate || c.rechargeDate || c.createdAt;
}

// Filters subscribers whose cycle-start date falls within [from, to].
// Empty from/to means "no date restriction".
export function applyConnectionDateRange(
  connections: Connection[],
  from: string,
  to: string,
): Connection[] {
  if (!from && !to) return connections;
  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate = to ? new Date(to + 'T23:59:59') : null;
  return connections.filter((c) => {
    const raw = connectionCycleStart(c);
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });
}
