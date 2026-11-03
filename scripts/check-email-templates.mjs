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
