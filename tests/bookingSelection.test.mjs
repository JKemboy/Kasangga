import test from "node:test";
import assert from "node:assert/strict";
import {
  selectedBookingService,
  bookingTotal,
  chooseBookingType,
} from "../src/services/bookingSelection.js";
test("booking retains service ID even when titles are duplicated", () => {
  const services = [
    { id: "1", name: "Math" },
    { id: "2", name: "Math" },
  ];
  assert.equal(selectedBookingService({ services, serviceId: 2 }).id, "2");
  assert.equal(
    selectedBookingService({ services, selectedService: "Math" }).id,
    "1",
  );
  assert.equal(selectedBookingService({ services }).id, "1");
  assert.equal(selectedBookingService({ services: [] }), undefined);
});
test("topic selection preserves totals and supported session types", () => {
  const sessions = [
    { date: "2026-11-01", time: "09:00", duration: 1.5, type: "Online" },
  ];
  assert.equal(bookingTotal(sessions, 199.99), 299.99);
  assert.equal(
    chooseBookingType(sessions, "all", "In-person", ["Online"]),
    sessions,
  );
  assert.equal(
    chooseBookingType(sessions, "all", "In-person", ["Online", "In-person"])[0]
      .type,
    "In-person",
  );
});
