export function searchBeaches(beaches, query) {
  if (!query) return [];

  const q = query.toLowerCase();

  return beaches.filter(
    (b) => b.city.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
  );
}
