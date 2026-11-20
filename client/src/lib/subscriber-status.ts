import type { Connection } from '@/lib/types';

/**
 * Whether a subscriber is active. Only active subscribers are billed by Bill
 * Creator and shown by default in the subscriber lists / defaulter reports.
 * Matches the backend rule (isBillableStatus in controllers/bill_creator.go):
 * case and surrounding spaces are ignored, every other status is not active.
 */
export function isActiveSubscriber(c: Pick<Connection, 'status'> | null | undefined): boolean {
  return String(c?.status ?? '').trim().toLowerCase() === 'active';
}
