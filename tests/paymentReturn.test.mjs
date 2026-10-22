import test from "node:test";
import assert from "node:assert/strict";
import {
  paymentBookingIds,
  confirmedPaymentSessions,
} from "../src/services/paymentReturn.js";
test("payment return identifies exact bookings without trusting status in URL", () => {
  assert.deepEqual(
    paymentBookingIds("?payment=success&booking_ids=1%2C2%2C1"),
    ["1", "2"],
  );
  assert.deepEqual(paymentBookingIds("?payment=success"), []);
  assert.deepEqual(paymentBookingIds("?booking_ids=x%2C-1%2C3"), ["3"]);
  assert.deepEqual(
    confirmedPaymentSessions(
      [{ id: "1", paymentStatus: "Pending", bookingStatus: "Confirmed" }],
      ["1"],
    ),
    [],
  );
  assert.deepEqual(
    confirmedPaymentSessions(
      [{ id: "1", paymentStatus: "Paid", bookingStatus: "Cancelled" }],
      ["1"],
    ),
    [],
  );
});
test("batch confirmation waits for all exact Supabase bookings to be paid", () => {
  const first = { id: "1", paymentStatus: "Paid", bookingStatus: "Confirmed" };
  const second = { id: "2", paymentStatus: "Paid", bookingStatus: "Confirmed" };
  assert.deepEqual(confirmedPaymentSessions([first], ["1", "2"]), []);
  assert.deepEqual(
    confirmedPaymentSessions(
      [
        first,
        second,
        { id: "3", paymentStatus: "Paid", bookingStatus: "Confirmed" },
      ],
      ["1", "2"],
    ),
    [first, second],
  );
  assert.deepEqual(confirmedPaymentSessions([first], []), []);
});
