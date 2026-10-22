export const ratingOptions = [
  "All Ratings",
  "Excellent (4.5-5.0)",
  "Very Good (4.0-4.4)",
  "Good (3.5-3.9)",
  "Fair (3.0-3.4)",
  "Poor (Below 3.0)",
];
export const priceOptions = [
  "All Prices",
  "Below \u20b1150 / hour",
  "\u20b1150 - \u20b1199 / hour",
  "\u20b1200 - \u20b1250 / hour",
];
export function matchesRating(value, filter) {
  if (filter === ratingOptions[0]) return true;
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 5) return false;
  if (filter === ratingOptions[1]) return rating >= 4.5;
  if (filter === ratingOptions[2]) return rating >= 4 && rating < 4.5;
  if (filter === ratingOptions[3]) return rating >= 3.5 && rating < 4;
  if (filter === ratingOptions[4]) return rating >= 3 && rating < 3.5;
  return filter === ratingOptions[5] && rating < 3;
}
export function matchesPrice(value, filter) {
  if (filter === priceOptions[0]) return true;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return false;
  if (filter === priceOptions[1]) return price < 150;
  if (filter === priceOptions[2]) return price >= 150 && price < 200;
  return filter === priceOptions[3] && price >= 200 && price <= 250;
}
