import { parseDate } from "./schedule.js";

export function validateTopicService(source, services = [], editingId = null) {
  const name = String(source.name || "")
    .trim()
    .replace(/\s+/g, " ");
  const description = String(source.description || "").trim();
  if (!name || name.length > 200)
    return { error: "Enter a service title / subject (up to 200 characters)." };
  if (!description || description.length > 160)
    return { error: "Enter a description (up to 160 characters)." };
  if (
    services.some(
      (service) =>
        service.id !== editingId &&
        service.name.trim().toLowerCase() === name.toLowerCase(),
    )
  )
    return { error: "A service with this name already exists." };
  if (
    !Array.isArray(source.topicDetails) ||
    source.topicDetails.length < 1 ||
    source.topicDetails.length > 20
  )
    return { error: "Add 1 to 20 topics." };
  const names = new Set(),
    allSlots = [];
  for (const topic of source.topicDetails) {
    const label = topic.name.trim();
    if (!label || label.length > 200 || names.has(label.toLowerCase()))
      return {
        error: "Each topic needs a different name (up to 200 characters).",
      };
    names.add(label.toLowerCase());
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(String(topic.rate)) ||
      Number(topic.rate) < 1 ||
      Number(topic.rate) > 10000
    )
      return {
        error: `${label}: enter a rate between PHP 1 and PHP 10,000 with up to two decimals.`,
      };
    if (
      !topic.types.length ||
      topic.types.some((type) => !["Online", "In-person"].includes(type))
    )
      return { error: `${label}: choose Online, In-Person, or both.` };
    if (topic.types.includes("Online")) {
      try {
        const url = new URL(topic.meetingLink);
        if (url.protocol !== "https:" || url.username || url.password)
          throw new Error();
      } catch {
        return { error: `${label}: enter a valid HTTPS meeting link.` };
      }
    }
    if (
      topic.types.includes("In-person") &&
      (!topic.location.trim() || topic.location.length > 300)
    )
      return {
        error: `${label}: enter a meeting place (up to 300 characters).`,
      };
    if (!topic.availability.length || topic.availability.length > 20)
      return { error: `${label}: add 1 to 20 dates and times.` };
    for (const slot of topic.availability) {
      const date = parseDate(slot.date);
      if (
        !date ||
        !Number.isFinite(slot.start) ||
        !Number.isFinite(slot.end) ||
        slot.start < 7 ||
        slot.end > 21 ||
        slot.end - slot.start !== 1 ||
        slot.start * 2 !== Math.round(slot.start * 2)
      )
        return {
          error: `${label}: choose valid one-hour times between 7 AM and 9 PM.`,
        };
      if (
        allSlots.some(
          (other) =>
            (other.date === slot.date ||
              ((other.repeat || slot.repeat) &&
                new Date(other.date + "T12:00:00").getDay() ===
                  date.getDay())) &&
            slot.start < other.end &&
            other.start < slot.end,
        )
      )
        return {
          error: `${label}: this time overlaps another selected time or topic.`,
        };
      allSlots.push(slot);
    }
  }
  return {
    values: {
      name,
      subtitle: name,
      description,
      category: "Other",
      level: "All Levels",
      topicDetails: source.topicDetails,
    },
    error: "",
  };
}
