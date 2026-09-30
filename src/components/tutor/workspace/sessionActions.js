import { confirmedClasses } from "./scheduleReview.js";
import { hour, slotError } from "./data.js";

export function sessionAction(
  data,
  id,
  action,
  values,
  now = new Date().toISOString(),
  preview = false,
) {
  const session = data.sessions.find((s) => s.id === id);
  if (!session) throw new Error("This session is no longer available.");
  const active = ["Confirmed", "Pending"].includes(session.status);
  const reason = String(values.reason || "").trim();
  if (!reason) throw new Error("Enter a reason before continuing.");
  if (action !== "incident" && !active)
    throw new Error("Only upcoming sessions can be changed.");
  let changed = { ...session };
  let reports = data.reports;
  if (action === "cancel") {
    if (!values.acknowledged)
      throw new Error("Acknowledge the cancellation policy.");
    changed = {
      ...changed,
      status: "Cancelled",
      payment:
        session.payment === "Paid" ? "Refund Under Review" : "Not charged",
      cancellation: { by: "Tutor", reason, at: now },
      reschedule: null,
    };
  } else if (action === "reschedule") {
    if (reason.length < 10)
      throw new Error("Explain the reason in at least 10 characters.");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.date || "") ||
      !/^\d{2}:\d{2}$/.test(values.time || "")
    )
      throw new Error("Choose a date and time.");
    if (
      new Date(`${values.date}T${values.time}:00+08:00`).getTime() <=
      new Date(now).getTime()
    )
      throw new Error("Choose a future date and time.");
    const duration = hour(session.end) - hour(session.start);
    const start = hour(values.time),
      end = start + duration;
    const conflict = slotError(
      {
        date: values.date,
        day: (new Date(`${values.date}T12:00:00`).getDay() + 6) % 7,
        start,
        end,
        type: session.type,
        repeat: false,
      },
      data.slots.filter((s) => s.kind === "unavailable"),
      data.sessions.filter((s) => s.id !== id),
      confirmedClasses(data),
    );
    if (conflict) throw new Error(conflict);
    const free = data.slots.some(
      (slot) =>
        (slot.repeat
          ? new Date(`${slot.date}T12:00:00`).getDay() ===
            new Date(`${values.date}T12:00:00`).getDay()
          : slot.date === values.date) &&
        Number(slot.start) <= start &&
        Number(slot.end) >= end &&
        (!slot.kind || slot.kind === "available") &&
        (slot.type === "Both" || slot.type === session.type),
    );
    if (!free)
      throw new Error("Choose a time within your available tutoring slots.");
    changed.reschedule = {
      date: values.date,
      start: values.time,
      end,
      reason,
      by: "Tutor",
      status: "Pending",
      at: now,
    };
  } else if (action === "incident") {
    if (!values.incidentType) throw new Error("Select the incident type.");
    if (reason.length < 20)
      throw new Error("Describe the incident in at least 20 characters.");
    const report = {
      id: crypto.randomUUID(),
      session: id,
      type: values.incidentType,
      description: reason,
      files: values.files || [],
      created: now,
      status: "Submitted locally",
    };
    reports = [...reports, report];
    changed.report = report;
  } else throw new Error("Unknown session action.");
  if (preview) return changed;
  const title =
    action === "cancel"
      ? "Session Cancelled"
      : action === "reschedule"
        ? "Reschedule Request Saved"
        : "Incident Report Submitted";
  const notification = {
    id: crypto.randomUUID(),
    title,
    text: session.learner + " / " + session.service,
    detail: reason,
    time: now,
    category: action === "incident" ? "Safety" : "Bookings",
    read: false,
    target: {
      view: "sessions",
      args: { sessionId: id },
      label: "View session",
    },
  };
  return {
    ...data,
    reports,
    notifications: [notification, ...(data.notifications || [])],
    sessions: data.sessions.map((s) => (s.id === id ? changed : s)),
  };
}

export function meetingUrl(value) {
  try {
    const url = new URL(
      value?.startsWith("https://") ? value : `https://${value}`,
    );
    return url.protocol === "https:" &&
      ["meet.google.com", "zoom.us", "www.zoom.us"].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function rescheduleOptions(data, id, now = new Date().toISOString()) {
  const session = data.sessions.find((s) => s.id === id);
  if (!session) return [];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  const options = [];
  for (let day = 0; day < 30; day++) {
    const current = new Date(`${today}T12:00:00Z`);
    current.setUTCDate(current.getUTCDate() + day);
    const date = current.toISOString().slice(0, 10);
    for (let start = 0; start < 24; start += 0.5) {
      const time = `${String(Math.floor(start)).padStart(2, "0")}:${start % 1 ? "30" : "00"}`;
      if (date === session.date && time === session.start) continue;
      try {
        sessionAction(
          data,
          id,
          "reschedule",
          { date, time, reason: "Availability preview" },
          now,
          true,
        );
        options.push({
          key: `${date} ${time}`,
          date,
          time,
          end: start + hour(session.end) - hour(session.start),
        });
      } catch {
        /* Only offer slots that pass the same checks as submission. */
      }
    }
  }
  return options;
}

export function respondToReschedule(
  data,
  id,
  accept,
  now = new Date().toISOString(),
) {
  const session = data.sessions.find((s) => s.id === id),
    request = session?.reschedule;
  if (
    !session ||
    !["Confirmed", "Pending"].includes(session.status) ||
    request?.status !== "Pending" ||
    request.by !== "Learner"
  )
    throw new Error("There is no pending learner request for this session.");
  let changed = {
    ...session,
    reschedule: {
      ...request,
      status: accept ? "Accepted" : "Declined",
      respondedAt: now,
    },
  };
  if (accept) {
    const validated = sessionAction(
      data,
      id,
      "reschedule",
      {
        date: request.date,
        time: request.start,
        reason: "Accept learner reschedule request",
      },
      now,
      true,
    );
    const end = validated.reschedule.end;
    changed = {
      ...changed,
      date: request.date,
      start: request.start,
      end: `${String(Math.floor(end)).padStart(2, "0")}:${String(Math.round((end % 1) * 60)).padStart(2, "0")}`,
    };
  }
  return {
    ...data,
    sessions: data.sessions.map((s) => (s.id === id ? changed : s)),
    notifications: [
      {
        id: crypto.randomUUID(),
        title: accept ? "Reschedule Accepted" : "Reschedule Declined",
        text: session.learner + " / " + session.service,
        detail: accept
          ? "The new session time is confirmed."
          : "The original session time is unchanged.",
        time: now,
        category: "Bookings",
        read: false,
        target: {
          view: "sessions",
          args: { sessionId: id },
          label: "View session",
        },
      },
      ...data.notifications,
    ],
  };
}
