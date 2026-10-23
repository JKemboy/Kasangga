import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookingSessionType,
  bookingPaymentStatus,
  matchesBookingPayment,
} from "../src/services/bookingMonitoringFilters.js";

test("matches the supported in-person spellings", () => {
  for (const type of ["In-person", "in_person", "In Person", "inperson"])
    assert.equal(bookingSessionType(type), "In Person");
  assert.equal(bookingSessionType("online"), "Online");
});
test("uses linked refund reviews and declined decisions for paid bookings", () => {
  assert.equal(
    bookingPaymentStatus({ payment: "Paid" }, { refundStatus: "pending" }),
    "Refund Review",
  );
  assert.equal(
    bookingPaymentStatus({ payment: "Paid" }, { refundStatus: "approved" }),
    "Refund Review",
  );
  assert.equal(
    bookingPaymentStatus({ payment: "Paid" }, { refundStatus: "declined" }),
    "Decline Refund",
  );
  assert.equal(bookingPaymentStatus({ payment: "Paid" }), "Paid");
});
test("preserves completed and partial refund payment states", () => {
  assert.equal(
    bookingPaymentStatus({ payment: "Refunded" }, { refundStatus: "declined" }),
    "Refunded",
  );
  assert.equal(
    bookingPaymentStatus(
      { payment: "Partially Refunded" },
      { refundStatus: "pending" },
    ),
    "Partially Refunded",
  );
  assert.equal(matchesBookingPayment("Partially Refunded", "Refunded"), true);
});
test("payment filters handle existing labels and exclude other statuses", () => {
  assert.equal(
    matchesBookingPayment("Refund Under Review", "Refund Review"),
    true,
  );
  assert.equal(
    matchesBookingPayment("Refund Declined", "Decline Refund"),
    true,
  );
  assert.equal(matchesBookingPayment("Paid", "Refund Review"), false);
  assert.equal(matchesBookingPayment("Unpaid", "Paid"), false);
  assert.equal(matchesBookingPayment("Paid", ""), true);
});
