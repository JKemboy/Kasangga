import assert from "node:assert/strict";
import test from "node:test";
import { createBatchPayment } from "./batch.ts";

const json = (body, status = 200) => Response.json(body, { status });
const payload = {
  serviceId: 1,
  topic: "Algebra",
  idempotencyKey: "request",
  sessions: [{ type: "Online" }, { type: "In-person" }],
};
const reserved = {
  title: "Math",
  amount: 1125,
  sessions: [
    { bookingId: 1, date: "2026-11-01", time: "09:00", amount: 450 },
    { bookingId: 2, date: "2026-11-02", time: "10:00", amount: 675 },
  ],
};

test("one checkout charges all sessions using server-calculated amounts", async () => {
  const calls = [];
  const admin = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return {
        data: name === "reserve_booking_batch" ? reserved : null,
        error: null,
      };
    },
  };
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const attributes = JSON.parse(options.body).data.attributes;
    assert.deepEqual(
      attributes.line_items.map((item) => item.amount),
      [45000, 67500],
    );
    assert.equal(attributes.line_items.length, 2);
    return json({
      data: {
        id: "cs_test",
        attributes: { checkout_url: "https://checkout.paymongo.com/test" },
      },
    });
  };
  try {
    const response = await createBatchPayment(
      admin,
      "learner",
      payload,
      "test-secret",
      "https://example.com",
      json,
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.bookingIds, [1, 2]);
    assert.equal(body.amount, 1125);
    assert.deepEqual(calls[0][1].p_sessions, payload.sessions);
    assert.equal(calls[1][0], "attach_booking_batch_checkout");
  } finally {
    globalThis.fetch = original;
  }
});

test("reservation conflicts stop before calling the payment provider", async () => {
  const admin = { rpc: async () => ({ error: { message: "Already booked" } }) };
  const response = await createBatchPayment(
    admin,
    "learner",
    payload,
    "test-secret",
    "https://example.com",
    json,
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "Already booked");
});

test("retry reuses the existing checkout", async () => {
  const admin = {
    rpc: async () => ({
      data: { checkoutUrl: "https://checkout.paymongo.com/existing" },
      error: null,
    }),
  };
  const response = await createBatchPayment(
    admin,
    "learner",
    payload,
    "test-secret",
    "https://example.com",
    json,
  );
  assert.equal(
    (await response.json()).checkoutUrl,
    "https://checkout.paymongo.com/existing",
  );
});

test("provider failure releases the reserved sessions", async () => {
  const calls = [];
  const admin = {
    rpc: async (name) => {
      calls.push(name);
      return { data: reserved, error: null };
    },
  };
  const original = globalThis.fetch;
  globalThis.fetch = async () => json({ error: "Unavailable" }, 502);
  try {
    const response = await createBatchPayment(
      admin,
      "learner",
      payload,
      "test-secret",
      "https://example.com",
      json,
    );
    assert.equal(response.status, 502);
    assert.deepEqual(calls, ["reserve_booking_batch", "cancel_booking_batch"]);
  } finally {
    globalThis.fetch = original;
  }
});
