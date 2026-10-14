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
export function loadConfig() {
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
