// Facility names: https://www.carsu.edu.ph/university-facilities/
export const CSU_MEETING_PLACES = [
  "CSU-HERO Learning Commons",
  "Hiraya Hall (CCIS)",
  "Iwag Hall (College of Education)",
  "Batok Hall (CMNS)",
  "Kinaadman Hall (CHaSS)",
  "CAA Building",
  "Hinang Hall (CEGS)",
  "Villares Hall (CFES)",
  "Masawa Hall",
  "CSU Gymnasium",
  "PE Building",
];
export const MIN_SERVICE_RATE = 75;
export const MAX_SERVICE_RATE = 250;
export function formatServiceDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "Choose a date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}
export function splitMeetingLocation(value = "") {
  const place = CSU_MEETING_PLACES.find((name) =>
    value.startsWith(name + " - "),
  );
  return {
    place: place || "",
    details: place ? value.slice(place.length + 3) : value,
  };
}
export function combineMeetingLocation(place, details) {
  return place && details.trim() ? place + " - " + details.trim() : "";
}
