export const configDefaults = {
  name: "Administrator",
  email: "",
  contact: "",
  position: "System Administrator",
  department: "Information Technology Services",
  emailVerification: true,
  twoFactor: true,
  maintenance: false,
  tutorAlerts: true,
  paymentAlerts: true,
  incidentAlerts: true,
  maintenanceAlerts: true,
};
export const applications = [];
export const adminServices = [];
export function loadCollection(key, fallback) {
  try {
    const d = JSON.parse(localStorage.getItem(key));
    if (
      Array.isArray(d) &&
      d.length === fallback.length &&
      new Set(d.map((r) => r.id)).size === d.length &&
      d.every(
        (r) => fallback.some((v) => v.id === r.id) && Array.isArray(r.history),
      )
    )
      return d;
  } catch {}
  return structuredClone(fallback);
}
export function loadConfig() {
  try {
    const d = JSON.parse(localStorage.getItem("campustutor:admin-config:v1"));
    if (
      d &&
      Number.isFinite(d.threshold) &&
      d.threshold >= 0 &&
      d.threshold <= 100
    )
      return { ...configDefaults, ...d };
  } catch {}
  return { ...configDefaults };
}
export function downloadData(name, rows) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const dateLabel = (v) =>
  new Date(v + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
