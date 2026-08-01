export type SearchableValue = string | number | null | undefined;

const startsWithNormalized = (q: string) => (v: SearchableValue) =>
  v !== null && v !== undefined && String(v).toLowerCase().startsWith(q);

export const isNumericQuery = (q: string) => /^[0-9]/.test(q.trim());

export const smartMatch = (query: string, ids: SearchableValue[], names: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const test = startsWithNormalized(q);
  return isNumericQuery(q) ? ids.some(test) : names.some(test);
};

export const prefixMatch = (query: string, ...values: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some(startsWithNormalized(q));
};
