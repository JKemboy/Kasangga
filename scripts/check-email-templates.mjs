import assert from "node:assert/strict";
import { emailContent } from "../supabase/functions/transactional-emails/templates.js";

for (const role of ["learner", "tutor", "lco", "oswe"]) {
  const email = emailContent(
    {
      kind: "system_notification",
      recipient_role: role,
      payload: { message: "PRIVATE_CASE_DETAIL" },
    },
    "https://kasangga.example",
  );
  assert.ok(email.text.includes(`https://kasangga.example/${role}-dashboard`));
  assert.ok(email.html.includes(`https://kasangga.example/${role}-dashboard`));
  assert.ok(!JSON.stringify(email).includes("PRIVATE_CASE_DETAIL"));
}
for (const kind of [
  "payment_received",
  "booking_confirmed",
  "tutor_booked",
  "session_reminder",
  "payment_transferred",
]) {
  const email = emailContent(
    {
      kind,
      booking_id: 123,
      recipient_role: "tutor",
      payload: {
        date: "2026-12-01",
        start: "10:00:00",
        name: "<script>alert(1)</script>",
        peer: "Learner",
        amount: 100,
      },
    },
    "https://kasangga.example",
  );
  assert.ok(email.subject.includes("123"));
  assert.ok(!email.html.includes("<script>"));
}
const approval = emailContent(
  {
    kind: "system_notification",
    recipient_role: "tutor",
    payload: { notification_type: "tutor_application_approved" },
  },
  "https://kasangga.example",
);
assert.ok(approval.subject.includes("Tutor application approved"));
assert.ok(approval.text.includes("LCO has approved"));
assert.ok(approval.text.includes("Learner access remains available"));
assert.ok(approval.text.includes("/learner-dashboard?section=application"));
for (const [type, subject, section] of [
  ["report_resolved", "Your report has been resolved", "reports"],
  [
    "refund_transferred",
    "Your refund has been marked as transferred",
    "sessions",
  ],
]) {
  const email = emailContent(
    {
      kind: "system_notification",
      recipient_role: "learner",
      payload: { notification_type: type },
    },
    "https://kasangga.example",
  );
  assert.ok(email.subject.includes(subject));
  assert.ok(email.text.includes(`/learner-dashboard?section=${section}`));
  if (type === "report_resolved")
    assert.ok(
      email.text.includes("resolution alone does not confirm a transfer"),
    );
}
assert.throws(() =>
  emailContent(
    { kind: "system_notification", recipient_role: "admin" },
    "https://kasangga.example",
  ),
);
assert.throws(() =>
  emailContent(
    { kind: "system_notification", recipient_role: "lco" },
    "http://kasangga.example",
  ),
);
console.log(
  "PASS: four role links, private detail exclusion, legacy templates, HTML escaping, role and URL validation",
);
