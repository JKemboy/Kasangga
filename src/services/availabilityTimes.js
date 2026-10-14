function weekdayFor(date) {
  return new Date(`${date}T12:00:00+08:00`)
    .toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Manila",
    })
    .toLowerCase();
}

function currentTimeInManila(now) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function availableBookingTimes(
  slots,
  date,
  duration,
  serviceId,
  now = new Date(),
  classBlocks = [],
  bookingBlocks = [],
  topicId = null,
) {
  if (
    !Array.isArray(slots) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Number(duration)) ||
    !serviceId
  )
    return [];

  const weekday = weekdayFor(date);
  const currentTime = currentTimeInManila(now);
  const options = new Map();
  const blocks = [
    ...classBlocks.filter((block) => block.dayName === weekday),
    ...bookingBlocks.filter((block) => block.date === date),
  ]
    .map((block) => ({
      start: timeInHours(block.start),
      end: timeInHours(block.end),
    }))
    .filter(
      (block) => Number.isFinite(block.start) && Number.isFinite(block.end),
    );
  for (const slot of slots) {
    if (
      slot.dayName !== weekday ||
      (slot.repeat === false && slot.date !== date) ||
      (slot.topicId && String(slot.topicId) !== String(topicId)) ||
      (slot.serviceId && slot.serviceId !== String(serviceId))
    )
      continue;
    for (
      let start = Math.ceil(slot.start * 2) / 2;
      start + Number(duration) <= slot.end;
      start += 0.5
    ) {
      const value = `${String(Math.floor(start)).padStart(2, "0")}:${String(Math.round((start % 1) * 60)).padStart(2, "0")}`;
      if (
        blocks.some(
          (block) =>
            start < block.end && start + Number(duration) > block.start,
        )
      )
        continue;
      if (
        date ===
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(now) &&
        value <= currentTime
      )
        continue;
      const existing = options.get(value);
      if (!existing || (existing.serviceId == null && slot.serviceId != null))
        options.set(value, {
          value,
          slotId: slot.id,
          serviceId: slot.serviceId,
        });
    }
  }
  return [...options.values()].sort((a, b) => a.value.localeCompare(b.value));
}

function timeInHours(value) {
  if (typeof value === "number") return value;
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return NaN;
  return Number(match[1]) + Number(match[2]) / 60;
}
