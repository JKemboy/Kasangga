import test from "node:test";
import assert from "node:assert/strict";
import { cancelLearnerSession } from "../src/services/learnerSessionActions.js";
import { filterSessions } from "../src/components/learner/sessions/sessionFilters.js";
import { meetingUrl } from "../src/services/sessionMeeting.js";
test("cancellation uses Supabase booking RPC and retains payment state", async () => {
  const record = { id: "42", paymentStatus: "Paid" };
  const client = {
    rpc: async (name, args) => {
      assert.equal(name, "cancel_chat_session");
      assert.deepEqual(args, {
        p_booking_id: 42,
        p_reason: "Schedule conflict: Class moved",
        p_acknowledged: true,
      });
      return { data: { cancelled: true }, error: null };
    },
  };
  assert.deepEqual(
    await cancelLearnerSession(
      record,
      {
        reason: "Schedule conflict",
        notes: " Class moved ",
        acknowledged: true,
      },
      client,
    ),
    { cancelled: true },
  );
  assert.equal(record.paymentStatus, "Paid");
});
test("failed cancellations surface server error without altering booking", async () => {
  const record = { id: "42", bookingStatus: "Confirmed" };
  await assert.rejects(
    cancelLearnerSession(
      record,
      { reason: "Other", acknowledged: true },
      {
        rpc: async () => ({
          error: { message: "Session has already started" },
        }),
      },
    ),
    /already started/,
  );
  assert.equal(record.bookingStatus, "Confirmed");
});
test("cancellation requires booking reason and policy acknowledgment before writing", async () => {
  const client = {
    rpc: async () => {
      assert.fail("RPC must not run");
    },
  };
  await assert.rejects(
    cancelLearnerSession(
      { id: "invalid" },
      { reason: "Other", acknowledged: true },
      client,
    ),
    /valid booking/,
  );
  await assert.rejects(
    cancelLearnerSession(
      { id: "42" },
      { reason: " ", acknowledged: true },
      client,
    ),
    /reason/,
  );
  await assert.rejects(
    cancelLearnerSession(
      { id: "42" },
      { reason: "Other", acknowledged: false },
      client,
    ),
    /policy/,
  );
});
test("Completed tab retains date and payment filters", () => {
  const completed = {
    lifecycle: "Completed",
    date: "2026-10-22",
    paymentStatus: "Paid",
  };
  const upcoming = { ...completed, lifecycle: "Upcoming" };
  assert.deepEqual(filterSessions([completed, upcoming], "Completed"), [
    completed,
  ]);
  assert.deepEqual(filterSessions([completed], "Completed", "2026-10-23"), []);
  assert.deepEqual(filterSessions([completed], "Completed", "all", "Paid"), [
    completed,
  ]);
});
test("external meetings accept secure URLs and reject unsafe protocols", () => {
  assert.equal(
    meetingUrl("https://meet.google.com/abc-defg-hij"),
    "https://meet.google.com/abc-defg-hij",
  );
  for (const url of [
    "javascript:alert(1)",
    "http://meet.google.com/abc",
    "https://user:pass@example.com",
    "",
  ])
    assert.equal(meetingUrl(url), null);
});
