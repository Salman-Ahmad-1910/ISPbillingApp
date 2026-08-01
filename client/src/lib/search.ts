export type SearchableValue = string | number | null | undefined;

const startsWithNormalized = (q: string) => (v: SearchableValue) =>
  v !== null && v !== undefined && String(v).toLowerCase().startsWith(q);

export const isNumericQuery = (q: string) => /^[0-9]/.test(q.trim());

export const smartMatch = (query: string, ids: SearchableValue[], names: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // First digit of an id -> search ids by prefix.
  if (isNumericQuery(q)) {
    return ids.some(startsWithNormalized(q));
  }
  // First letter of a name -> search names by prefix (also allows
  // letter-prefixed ids such as internet IDs like "NET-0001").
  return names.some(startsWithNormalized(q)) || ids.some(startsWithNormalized(q));
};

export const prefixMatch = (query: string, ...values: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some(startsWithNormalized(q));
};
