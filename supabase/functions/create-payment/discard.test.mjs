import assert from "node:assert/strict";
import test from "node:test";
import { discardUnpaidCheckouts } from "./discard.ts";
function admin(payment = "unpaid") {
  const calls = [];
  return {
    calls,
    from(table) {
      const result = {
        data:
          table === "booking_checkout_batches"
            ? [{ request_id: "request", checkout_id: "cs_test" }]
            : table === "booking_checkout_batch_items"
              ? [{ booking_id: 1 }]
              : [{ payment_status: payment, booking_status: "pending" }],
        error: null,
      };
      const chain = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        is() {
          return this;
        },
        in() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return chain;
    },
    rpc: async (name) => {
      calls.push(name);
      return { error: null };
    },
  };
}
test("unpaid reservation is removed only after provider expiry", async () => {
  const db = admin(),
    original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith("/expire"));
    assert.equal(options.method, "POST");
    return Response.json({});
  };
  try {
    await discardUnpaidCheckouts(db, "learner", "test-secret");
    assert.deepEqual(db.calls, ["discard_unpaid_booking_batch"]);
  } finally {
    globalThis.fetch = original;
  }
});
test("an ongoing payment cannot be discarded", async () => {
  const db = admin(),
    original = globalThis.fetch;
  globalThis.fetch = async (url) =>
    url.endsWith("/expire")
      ? Response.json({}, { status: 400 })
      : Response.json({ data: { attributes: { status: "active" } } });
  try {
    await assert.rejects(
      () => discardUnpaidCheckouts(db, "learner", "test-secret"),
      /still be processing/,
    );
    assert.equal(db.calls.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("already paid bookings are preserved", async () => {
  const db = admin("paid"),
    original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Paid checkout must not be expired");
  };
  try {
    await discardUnpaidCheckouts(db, "learner", "test-secret");
    assert.equal(db.calls.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});
