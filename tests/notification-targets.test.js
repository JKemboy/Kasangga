import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/components/tutor/workspace/data.js";
import { notificationDestination } from "../src/components/tutor/workspace/notificationTargets.js";

const notification = (title) =>
  seed.notifications.find((item) => item.title === title);

test("new notifications preserve explicit record metadata and action labels", () => {
  const item = {
    id: "booking-event-new",
    title: "Booking Confirmed",
    target: {
      view: "sessions",
      args: { sessionId: "booking-new" },
      label: "Review booking",
    },
  };
  const result = notificationDestination(item);
  assert.deepEqual(result, item.target);
  result.args.sessionId = "changed-by-consumer";
  assert.equal(item.target.args.sessionId, "booking-new");

  assert.deepEqual(
    notificationDestination({
      id: "payment-event-new",
      title: "Payment Confirmed",
      view: "earnings",
      args: { transactionId: "transaction-new" },
    }),
    {
      view: "earnings",
      args: { transactionId: "transaction-new" },
      label: "View payment",
    },
  );
});

test("legacy browser notifications retain their related destinations", () => {
  for (const item of seed.notifications) {
    const { target, ...legacy } = item;
    // Older persisted reviews linked to the profile before related service support.
    if (legacy.title === "New Rating/Review") legacy.view = "profile";
    assert.deepEqual(notificationDestination(legacy), target, item.title);
  }
});

test("a reused title or ID alone never attaches an unrelated demo record", () => {
  const booking = notification("Booking Confirmed");
  for (const item of [
    { id: "different-id", title: booking.title, view: "sessions" },
    { id: booking.id, title: "Different booking event", view: "sessions" },
    { title: booking.title, view: "sessions" },
  ]) {
    assert.deepEqual(notificationDestination(item), {
      view: "sessions",
      args: {},
      label: "View session",
    });
  }
});

test("explicit metadata takes precedence over matching legacy seed identity", () => {
  const { target, ...legacy } = notification("Booking Confirmed");
  assert.ok(target);
  const override = {
    view: "messages",
    args: { learner: "Another Learner" },
    label: "Reply to learner",
  };
  assert.deepEqual(
    notificationDestination({
      ...legacy,
      args: { sessionId: "ignored-flat-value" },
      target: override,
    }),
    override,
  );
  assert.deepEqual(
    notificationDestination({ ...legacy, args: { sessionId: "new-booking" } })
      .args,
    { sessionId: "new-booking" },
  );
});

test("null or unknown explicit destinations cannot fall back to a demo action", () => {
  const legacy = {
    id: "0",
    title: "Booking Confirmed",
    view: "sessions",
  };
  for (const target of [null, { view: "unknown" }, { view: "toString" }]) {
    assert.equal(notificationDestination({ ...legacy, target }), null);
  }
  for (const item of [
    null,
    undefined,
    {},
    { id: "new", title: "Account activity" },
    { view: "unknown" },
  ]) {
    assert.equal(notificationDestination(item), null);
  }
});

test("seed actions identify the booking, payment, conversation and services described", () => {
  const booking = notificationDestination(notification("Booking Confirmed"));
  const session = seed.sessions.find((s) => s.id === booking.args.sessionId);
  assert.equal(booking.view, "sessions");
  assert.equal(session?.learner, "Maria Angela R.");
  assert.equal(session?.service, "Calculus 1");
  assert.equal(session?.topic, "Derivatives");

  const payment = notificationDestination(notification("Payment Confirmed"));
  const transaction = seed.sessions.find(
    (s) => s.transaction === payment.args.transactionId,
  );
  assert.equal(payment.view, "earnings");
  assert.equal(transaction?.learner, "Maria Angela R.");
  assert.equal(transaction?.service, "Calculus 1");
  assert.equal(transaction?.amount, 525);
  assert.equal(transaction?.payment, "Paid");

  const reminder = notificationDestination(notification("Session Reminder"));
  const upcoming = seed.sessions.find((s) => s.id === reminder.args.sessionId);
  assert.equal(reminder.view, "sessions");
  assert.equal(upcoming?.learner, "Allen Ezra M.");
  assert.equal(upcoming?.provider, "Zoom");

  const message = notificationDestination(notification("New Message"));
  const thread = seed.threads.find((t) => t.name === message.args.learner);
  assert.equal(message.view, "messages");
  assert.ok(thread?.messages.some((m) => m.text === "Is the Zoom link ready?"));

  const update = notificationDestination(notification("Service Status Update"));
  const service = seed.services.find((s) => s.id === update.args.serviceId);
  assert.equal(update.view, "services");
  assert.equal(service?.name, "Linear Algebra");
  assert.equal(service?.status, "Suspended");

  const review = notificationDestination(notification("New Rating/Review"));
  assert.equal(review.view, "services");
  assert.equal(
    seed.services.find((s) => s.id === review.args.serviceId)?.name,
    "Physics 1",
  );
});

test("sample request and incident actions use available context without inventing records", () => {
  const request = notificationDestination(notification("Reschedule Request"));
  assert.equal(request.view, "messages");
  assert.equal(request.args.sessionId, undefined);
  assert.ok(seed.threads.some((t) => t.name === request.args.learner));

  const incident = notificationDestination(
    notification("Incident Report Update"),
  );
  assert.equal(incident.view, "help");
  assert.deepEqual(incident.args, { topic: "Incident Reporting" });
});
