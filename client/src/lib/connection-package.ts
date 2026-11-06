import type { Connection } from '@/lib/types';

type PackageConnection = Pick<
  Connection,
  'connectionType' | 'packageCable' | 'packageInternet'
>;

function realPackageName(name?: string | null): string {
  const value = String(name ?? '').trim();
  return value && value.toLowerCase() !== 'none' ? value : '';
}

/**
 * The package names that actually apply to a connection.
 *
 * A connection's type decides which package columns are in use. Internet-only
 * connections never show a cable package and cable-only connections never show
 * an internet package, even if an older save left a stale value behind. Keeping
 * this rule in one place makes the subscriber detail and collection pages show
 * the same package for the same subscriber.
 */
export function connectionPackageSides(connection: PackageConnection): {
  cable: string;
  internet: string;
} {
  const cable = realPackageName(connection.packageCable);
  const internet = realPackageName(connection.packageInternet);
  const type = String(connection.connectionType || 'both').toLowerCase();

  if (type === 'internet') {
    return { cable: '', internet };
  }
  if (type === 'tv_cable') {
    return { cable, internet: '' };
  }
  return { cable, internet };
}

/** A single label for a connection's active package(s), e.g. "Cable + Internet". */
export function connectionPackageLabel(connection: PackageConnection): string {
  const { cable, internet } = connectionPackageSides(connection);
  return [cable, internet].filter(Boolean).join(' + ') || '---';
}

/** Whether the cable side is part of the connection's package assignment. */
export function connectionUsesCable(connection: Pick<Connection, 'connectionType'>): boolean {
  const type = String(connection.connectionType || 'both').toLowerCase();
  return type === 'both' || type === 'tv_cable';
}

/** Whether the internet side is part of the connection's package assignment. */
export function connectionUsesInternet(connection: Pick<Connection, 'connectionType'>): boolean {
  const type = String(connection.connectionType || 'both').toLowerCase();
  return type === 'both' || type === 'internet';
}
