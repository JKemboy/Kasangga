import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/components/tutor/workspace/data.js";
import {
  sessionAction,
  rescheduleOptions,
  meetingUrl,
} from "../src/components/tutor/workspace/sessionActions.js";
import { notificationDestination } from "../src/components/tutor/workspace/notificationTargets.js";
const now = "2026-09-17T00:00:00Z";
test("reschedule choices preserve duration, reject conflicts and keep the original booking until accepted", () => {
  const data = structuredClone(seed);
  const options = rescheduleOptions(data, "up-1", now);
  assert.ok(options.length);
  for (const option of options) {
    const next = sessionAction(
      data,
      "up-1",
      "reschedule",
      {
        date: option.date,
        time: option.time,
        reason: "Department activity conflict",
      },
      now,
    );
    const session = next.sessions.find((s) => s.id === "up-1");
    assert.equal(session.date, "2026-09-18");
    assert.equal(session.start, "14:00");
    assert.equal(session.reschedule.end, option.end);
    assert.equal(session.reschedule.status, "Pending");
    assert.ok(
      new Date(`${option.date}T${option.time}:00+08:00`) > new Date(now),
    );
  }
  assert.deepEqual(data, seed);
});
test("no availability produces no choices and a manual conflicting time is rejected", () => {
  assert.deepEqual(rescheduleOptions({ ...seed, slots: [] }, "up-1", now), []);
  assert.throws(
    () =>
      sessionAction(
        seed,
        "up-1",
        "reschedule",
        {
          date: "2026-09-18",
          time: "15:00",
          reason: "Department activity conflict",
        },
        now,
      ),
    /class schedule/,
  );
});
test("cancellation and reports add clickable activity for their own session", () => {
  const cancelled = sessionAction(
    seed,
    "up-1",
    "cancel",
    { reason: "Illness: Unable to attend", acknowledged: true },
    now,
  );
  assert.equal(cancelled.sessions[0].status, "Cancelled");
  assert.equal(cancelled.sessions[0].payment, "Refund Under Review");
  assert.deepEqual(notificationDestination(cancelled.notifications[0]).args, {
    sessionId: "up-1",
  });
  const files = [
    {
      name: "evidence.png",
      type: "image/png",
      data: "data:image/png;base64,example",
    },
  ];
  const reported = sessionAction(
    seed,
    "up-2",
    "incident",
    {
      reason: "The learner could not enter the meeting.",
      incidentType: "Technical issue",
      files,
    },
    now,
  );
  assert.deepEqual(reported.reports[0].files, files);
  assert.deepEqual(notificationDestination(reported.notifications[0]).args, {
    sessionId: "up-2",
  });
  assert.equal(seed.reports.length, 0);
});
test("external meetings only accept supported secure meeting hosts", () => {
  assert.equal(
    meetingUrl("https://meet.google.com/xkt-pqrm-bnv"),
    "https://meet.google.com/xkt-pqrm-bnv",
  );
  for (const value of [
    "javascript:alert(1)",
    "https://meet.google.com.evil.example/a",
    "https://example.org",
  ])
    assert.equal(meetingUrl(value), null);
});
