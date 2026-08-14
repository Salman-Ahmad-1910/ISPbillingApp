export type SearchableValue = string | number | null | undefined;

const startsWithNormalized = (q: string) => (v: SearchableValue) =>
  v !== null && v !== undefined && String(v).toLowerCase().startsWith(q);

const containsNormalized = (q: string) => (v: SearchableValue) =>
  v !== null && v !== undefined && String(v).toLowerCase().includes(q);

export const smartMatch = (query: string, ids: SearchableValue[], names: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Search both IDs (alphanumeric, e.g. INT-123) and names with the same
  // substring matching, so partial digits/letters work everywhere.
  return ids.some(containsNormalized(q)) || names.some(containsNormalized(q));
};

export const prefixMatch = (query: string, ...values: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some(startsWithNormalized(q));
};
