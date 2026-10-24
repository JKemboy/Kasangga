import test from "node:test";
import assert from "node:assert/strict";
import { emailContent } from "../supabase/functions/transactional-emails/templates.js";
import { processEmails } from "../supabase/functions/transactional-emails/worker.js";
import { studentNavigationCounts } from "../src/services/navigationCounts.js";

const job = {
  id: "test-email-id",
  booking_id: 42,
  kind: "booking_confirmed",
  recipient_role: "learner",
  recipient_email: "learner@example.test",
  lease_token: "lease",
  attempts: 1,
  payload: {
    name: "Student <script>",
    peer: "Tutor",
    service: "Math & Science",
    topic: "Algebra",
    date: "2026-11-02",
    start: "09:00:00",
    amount: 200,
    session_type: "Online",
  },
};
const config = {
  apiKey: "mock-not-a-secret",
  from: "Kasangga <test@example.test>",
  appUrl: "https://kasangga-test.vercel.app",
};
function mockDatabase() {
  const writes = [];
  const filters = [];
  const chain = {
    eq: (...args) => {
      filters.push(args);
      return chain;
    },
    then: (resolve) => Promise.resolve({ error: null }).then(resolve),
  };
  return {
    writes,
    filters,
    rpc: async () => ({ data: [job], error: null }),
    from: (table) => ({
      update: (value) => {
        assert.equal(table, "transactional_email_outbox");
        writes.push(value);
        return chain;
      },
    }),
  };
}

test("all requested emails render safe content and the correct role destination", () => {
  for (const kind of [
    "payment_received",
    "booking_confirmed",
    "tutor_booked",
    "session_reminder",
    "payment_transferred",
  ]) {
    const role = ["tutor_booked", "payment_transferred"].includes(kind)
      ? "tutor"
      : "learner";
    const content = emailContent(
      { ...job, kind, recipient_role: role },
      config.appUrl,
    );
    assert.ok(
      content.text.includes(
        `${role}-dashboard?section=${kind === "payment_transferred" ? "earnings" : "sessions"}`,
      ),
    );
    assert.ok(content.text.includes("9:00"));
    assert.ok(content.html.includes("&lt;script&gt;"));
    assert.ok(!content.html.includes("<script>"));
    assert.ok(content.subject.includes("#42"));
  }
  assert.throws(() => emailContent(job, "http://unsafe.example"), /HTTPS/);
  assert.throws(
    () => emailContent({ ...job, kind: "invalid" }, config.appUrl),
    /Unsupported/,
  );
});
test("provider acceptance persists delivery and guards the lease", async () => {
  const db = mockDatabase();
  const result = await processEmails(db, config, async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(
      options.headers["Idempotency-Key"],
      "kasangga-email/test-email-id",
    );
    assert.deepEqual(JSON.parse(options.body).to, [job.recipient_email]);
    return new Response(JSON.stringify({ id: "provider-id" }), { status: 200 });
  });
  assert.equal(result.accepted, 1);
  assert.equal(db.writes[0].status, "sent");
  assert.equal(db.writes[0].provider_id, "provider-id");
  assert.ok(
    db.filters.some(
      ([key, value]) => key === "lease_token" && value === job.lease_token,
    ),
  );
});
test("rate limits retry without marking an email sent", async () => {
  const db = mockDatabase();
  const result = await processEmails(
    db,
    config,
    async () => new Response("{}", { status: 429 }),
  );
  assert.equal(result.retried, 1);
  assert.equal(db.writes[0].status, "pending");
  assert.ok(Date.parse(db.writes[0].due_at) > Date.now());
});
test("permanent provider rejection stops automatic retries", async () => {
  const db = mockDatabase();
  await processEmails(
    db,
    config,
    async () => new Response("{}", { status: 403 }),
  );
  assert.equal(db.writes[0].status, "failed");
});
test("sidebar counts use unread and actionable Supabase records", () => {
  const inbox = {
    notifications: [{ read: true }, { read: false }],
    threads: [{ unread: 3 }],
    sessions: [
      { bookingStatus: "Confirmed", paymentStatus: "Paid" },
      { bookingStatus: "Cancelled", paymentStatus: "Paid" },
      { bookingStatus: "Pending", paymentStatus: "Unpaid" },
    ],
  };
  const workspace = {
    sessions: [
      { id: "1", bookingStatus: "Completed", paymentStatus: "Paid" },
      { id: "2", bookingStatus: "Completed", paymentStatus: "Paid" },
    ],
    reviews: [{ sessionId: "1" }],
  };
  assert.deepEqual(studentNavigationCounts("learner", inbox, workspace), {
    messages: 3,
    notifications: 1,
    sessions: 1,
    reviews: 1,
  });
  assert.deepEqual(
    studentNavigationCounts("tutor", {
      sessions: [{ status: "Confirmed", payment: "Paid" }],
    }),
    { messages: 0, notifications: 0, sessions: 1 },
  );
});
