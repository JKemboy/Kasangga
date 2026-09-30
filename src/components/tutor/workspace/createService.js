import { confirmedClasses } from "./scheduleReview.js";
import { slotError } from "./data.js";
import { validateService } from "./serviceRules.js";
function slot(row, type) {
  return {
    ...row,
    day: (new Date(row.date + "T12:00:00").getDay() + 6) % 7,
    start: Number(row.start),
    end: Number(row.end),
    type,
    repeat: false,
    kind: "available",
  };
}
export function serviceAvailabilityErrors(rows, type, data, now = new Date()) {
  return rows.map((row) => {
    const value = slot(row, type);
    if (
      new Date(
        `${row.date}T${String(Math.floor(value.start)).padStart(2, "0")}:${value.start % 1 ? "30" : "00"}:00+08:00`,
      ) <= now
    )
      return "Choose a future date and time.";
    // General availability can be reserved; only other service reservations conflict.
    return slotError(
      value,
      [
        ...data.slots.filter((s) => s.serviceId || s.kind === "unavailable"),
        ...rows.filter((r) => r.id !== row.id).map((r) => slot(r, type)),
      ],
      data.sessions,
      confirmedClasses(data),
    );
  });
}
export function createService(data, input, rows, now = new Date()) {
  const result = validateService(input, data.services);
  if (result.error) throw new Error(result.error);
  if (result.values.description.length > 160)
    throw new Error("Description must be 160 characters or fewer.");
  if (!rows.length)
    throw new Error("Add at least one availability date and time.");
  const errors = serviceAvailabilityErrors(rows, result.values.type, data, now);
  if (errors.some(Boolean)) throw new Error(errors.find(Boolean));
  const service = {
    ...result.values,
    id: crypto.randomUUID(),
    status: "Active",
    rating: 0,
    completed: 0,
  };
  return {
    ...data,
    services: [service, ...data.services],
    slots: [
      ...data.slots,
      ...rows.map((row) => ({
        ...slot(row, service.type),
        id: crypto.randomUUID(),
        serviceId: service.id,
        serviceName: service.name,
      })),
    ],
  };
}
