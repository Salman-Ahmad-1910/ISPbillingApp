export type SearchableValue = string | number | null | undefined;
 
// Minimum query length before we fall back to searching names when no ID matches.
export const NAME_SEARCH_MIN_LENGTH = 3;
 
const startsWithNormalized = (q: string) => (v: SearchableValue) =>
  v !== null && v !== undefined && String(v).toLowerCase().startsWith(q);
 
const containsNormalized = (q: string) => (v: SearchableValue) =>
  v !== null && v !== undefined && String(v).toLowerCase().includes(q);
 
export const smartMatch = (query: string, ...groups: SearchableValue[][]): boolean => {
  return smartMatchScore(query, ...groups) >= 0;
};
 
// Returns 0 (prefix match) or 1 (substring match) within a single group of
// values, or -1 if nothing in the group matches at all.
const matchGroup = (q: string, values: SearchableValue[]): number => {
  let substringMatch = -1;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).toLowerCase();
    if (s.startsWith(q)) return 0;
    if (substringMatch < 0 && s.includes(q)) substringMatch = 1;
  }
  return substringMatch;
};
 
// Ranked match, lower is better, -1 = no match.
//
// `groups` is a list of value-groups in priority order, e.g.
// [idFields, nameFields, phoneFields]. Every group earns a score of
// `groupIndex * 2 + (0 = prefix match | 1 = substring match)`, so ANY match
// in an earlier group always outranks ANY match in a later group — a tier-1
// substring match (score 1) still beats a tier-2 prefix match (score 2).
// This is what keeps unrelated fields (like phone numbers) from tying with,
// and burying, a real ID match just because both happen to contain the
// typed digits somewhere.
//
// The first group (index 0, normally IDs) is always checked, regardless of
// query length, since ids are meant to be typed as short prefixes (e.g. the
// first couple of letters of "K5071"). Every later group is only checked
// once the user has typed at least NAME_SEARCH_MIN_LENGTH characters AND no
// earlier group matched at all — so a 1-2 char query only ever matches ids.
export const smartMatchScore = (query: string, ...groups: SearchableValue[][]): number => {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
 
  for (let i = 0; i < groups.length; i++) {
    if (i > 0 && q.length < NAME_SEARCH_MIN_LENGTH) break;
    const groupScore = matchGroup(q, groups[i]);
    if (groupScore >= 0) return i * 2 + groupScore;
  }
 
  return -1;
};
 
export const prefixMatch = (query: string, ...values: SearchableValue[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some(startsWithNormalized(q));
};
 
// Convenience helper: filters `items` down to the ones that match, AND sorts
// them so the best matches (earliest matching group first, prefix before
// substring within a group) come first. Ties keep their original relative
// order. This is the piece that actually moves a matched entry like
// "INT-502" to the top of the list — smartMatch()/smartMatchScore() alone
// only tell you whether/how well something matches, they don't reorder
// your array.
//
// `getGroups` should return the SAME priority-ordered groups you'd pass to
// smartMatchScore, e.g. (item) => [[item.internetId, item.id], [item.name], [item.cell, item.mobile]]
export const smartSearch = <T>(
  query: string,
  items: T[],
  getGroups: (item: T) => SearchableValue[][]
): T[] => {
  return items
    .map((item, index) => ({ item, index, score: smartMatchScore(query, ...getGroups(item)) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.item);
};
 
export { containsNormalized };
 
