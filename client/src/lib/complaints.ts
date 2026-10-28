import type { Complaint } from './types';

/** Splits the stored comma-separated assignee list into unique, non-empty IDs. */
export function parseAssigneeIds(value?: string | null): string[] {
  if (!value) return [];

  const ids: string[] = [];
  for (const part of String(value).split(',')) {
    const id = part.trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Every assignee of a complaint, falling back to the legacy single assignee. */
export function getComplaintAssigneeIds(
  complaint?: Pick<Complaint, 'assignedToId' | 'assignedToIds'> | null
): string[] {
  if (!complaint) return [];

  const ids = parseAssigneeIds(complaint.assignedToIds);
  if (ids.length > 0) return ids;
  return complaint.assignedToId ? [complaint.assignedToId] : [];
}

/** Serialises assignee IDs for the API. */
export function joinAssigneeIds(ids: string[]): string {
  return ids.filter(Boolean).join(',');
}
