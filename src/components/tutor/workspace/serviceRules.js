export const SERVICE_CATEGORIES = Object.freeze([
  "Mathematics",
  "Science",
  "Computer Science",
  "Languages",
  "Other",
]);
export const SERVICE_LEVELS = Object.freeze(["College", "All Levels"]);
export const SERVICE_TYPES = Object.freeze(["Online", "In-person", "Both"]);

const text = (value) => (typeof value === "string" ? value.trim() : "");
const serviceName = (value) => text(value).replace(/\s+/g, " ");

// Return only tutor-editable fields. The caller retains the existing record's
// identity, moderation status, rating, and completed-session total when merging.
export function validateService(input, services = [], editingId = null) {
  if (editingId !== null && editingId !== undefined) {
    const existing = services.find((service) => service.id === editingId);
    if (!existing) {
      return {
        error: "This service no longer exists. Close the form and try again.",
      };
    }
    if (existing.status === "Suspended") {
      return {
        error: "Suspended services cannot be edited. Contact support for help.",
      };
    }
  }

  const source = input || {};
  const values = {
    name: serviceName(source.name),
    subtitle: text(source.subtitle),
    category: text(source.category),
    level: text(source.level),
    description: text(source.description),
    topics: text(source.topics),
    rate: 0,
    type: text(source.type),
  };

  for (const [field, label, limit] of [
    ["name", "Service / Subject", 200],
    ["subtitle", "Subtitle", 200],
    ["description", "Description", 600],
    ["topics", "Topics / Skills", 200],
  ]) {
    if (!values[field]) return { error: `${label} is required.` };
    if (values[field].length > limit) {
      return { error: `${label} must be ${limit} characters or fewer.` };
    }
  }

  const categories = new Set([
    ...SERVICE_CATEGORIES,
    ...services.map((service) => text(service.category)).filter(Boolean),
  ]);
  if (!categories.has(values.category)) {
    return { error: "Choose a valid service category." };
  }
  if (!SERVICE_LEVELS.includes(values.level)) {
    return { error: "Choose a valid student level." };
  }
  if (!SERVICE_TYPES.includes(values.type)) {
    return { error: "Choose a valid session type." };
  }

  const rateText =
    typeof source.rate === "number" ? String(source.rate) : text(source.rate);
  const rate = Number(rateText);
  if (!rateText || !Number.isFinite(rate) || rate < 1 || rate > 10000) {
    return { error: "Rate must be between ₱1 and ₱10,000 per hour." };
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(rateText)) {
    return { error: "Enter a rate with no more than two decimal places." };
  }
  values.rate = rate;

  const duplicate = services.some(
    (service) =>
      service.id !== editingId &&
      serviceName(service.name).toLowerCase() === values.name.toLowerCase(),
  );
  if (duplicate) {
    return { error: "A service with this name already exists." };
  }

  return { values, error: "" };
}
