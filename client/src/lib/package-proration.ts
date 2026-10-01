// Mirrors the proration logic in controllers/connection.go so the figure shown
// before saving is exactly what the backend posts to remaining_amount.

export type PackageProrationReason = 'adjustment' | 'unchanged';

export interface PackageProration {
  /** True when an amount will be added to or subtracted from the balance. */
  applies: boolean;
  /** Positive charges the subscriber more, negative creates/extends an advance. */
  delta: number;
  oldFee: number;
  newFee: number;
  daysUsed: number;
  daysRemaining: number;
  daysInMonth: number;
  reason: PackageProrationReason;
}

// Matches monthlyPackageFee in controllers/connection.go.
export function monthlyPackageFee(
  connectionType?: string | null,
  amount?: number | null,
  sameAmount?: number | null
): number {
  const cable = Number(amount) || 0;
  const internet = Number(sameAmount) || 0;
  if (connectionType === 'internet') return internet;
  if (connectionType === 'both') return cable + internet;
  return cable;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A package fee change is prorated across the billing month it takes effect in.
 * That month is billed in advance at the old rate, so only the days still ahead
 * of the subscriber carry the new rate:
 *
 *   delta = (newFee - oldFee) * remainingDays / daysInMonth
 *
 * A change on the 1st is the full difference, since the whole month still
 * carries the new rate.
 */
export function packageProration(
  effective: Date,
  oldFee: number,
  newFee: number
): PackageProration {
  const day = effective.getDate();
  const daysInMonth = new Date(effective.getFullYear(), effective.getMonth() + 1, 0).getDate();
  const daysUsed = day - 1;
  const daysRemaining = daysInMonth - day + 1;

  const detail = { oldFee, newFee, daysUsed, daysRemaining, daysInMonth, delta: 0 };

  if (oldFee === newFee) {
    return { ...detail, applies: false, reason: 'unchanged' };
  }

  const delta = roundToTwo(((newFee - oldFee) * daysRemaining) / daysInMonth);
  return { ...detail, applies: true, delta, reason: 'adjustment' };
}

export function formatPkr(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}