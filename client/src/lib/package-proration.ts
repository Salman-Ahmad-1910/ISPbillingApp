// Mirrors the fee logic in controllers/connection.go so the figure shown before
// saving is exactly what the backend uses as the base for a balance.

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

export function formatPkr(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}