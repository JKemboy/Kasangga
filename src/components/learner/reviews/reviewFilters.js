export function sortReviews(reviews, sort = "recent") {
  const comparators = {
    recent: (a, b) => new Date(b[6]) - new Date(a[6]),
    oldest: (a, b) => new Date(a[6]) - new Date(b[6]),
    highest: (a, b) => Number(b[3]) - Number(a[3]),
    lowest: (a, b) => Number(a[3]) - Number(b[3]),
    name: (a, b) => a[0].localeCompare(b[0]),
  };
  return [...reviews].sort(comparators[sort] || comparators.recent);
}
