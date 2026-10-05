import test from "node:test";
import assert from "node:assert/strict";
import {
  sendLearnerOtp,
  verifyLearnerOtp,
  learnerOtpMessage,
} from "../src/services/learnerOtp.js";

test("registration normalizes email and explicitly permits signup; login never does", async () => {
  const calls = [];
  const client = {
    auth: {
      signInWithOtp: async (value) => {
        calls.push(value);
        return {};
      },
    },
  };
  await sendLearnerOtp(" Student@CARSU.EDU.PH ", true, client);
  await sendLearnerOtp("student@carsu.edu.ph", false, client);
  assert.deepEqual(
    calls.map((c) => c.options.shouldCreateUser),
    [true, false],
  );
  assert.equal(calls[0].email, "student@carsu.edu.ph");
  await assert.rejects(sendLearnerOtp("student@gmail.com", true, client));
  await assert.rejects(
    sendLearnerOtp("student@carsu.edu.ph.evil.com", false, client),
  );
  assert.equal(calls.length, 2);
});
test("verification requires a session for the requested email", async () => {
  const session = {
    access_token: "test-token",
    user: { id: "test-id", email: "student@carsu.edu.ph" },
  };
  let input;
  const client = {
    auth: {
      verifyOtp: async (value) => {
        input = value;
        return { data: { session } };
      },
    },
  };
  assert.equal(
    await verifyLearnerOtp(" Student@CARSU.EDU.PH ", "123456", client),
    session,
  );
  assert.deepEqual(input, {
    email: "student@carsu.edu.ph",
    token: "123456",
    type: "email",
  });
  await assert.rejects(verifyLearnerOtp("student@carsu.edu.ph", "abc", client));
  await assert.rejects(
    verifyLearnerOtp("other@carsu.edu.ph", "123456", client),
  );
  await assert.rejects(
    verifyLearnerOtp("student@carsu.edu.ph", "123456", {
      auth: { verifyOtp: async () => ({ data: { session: null } }) },
    }),
  );
});
test("unregistered login errors propagate without a signup fallback", async () => {
  let count = 0;
  const client = {
    auth: {
      signInWithOtp: async () => {
        count++;
        return { error: { code: "otp_disabled" } };
      },
    },
  };
  await assert.rejects(sendLearnerOtp("new@carsu.edu.ph", false, client));
  assert.equal(count, 1);
  assert.match(learnerOtpMessage({ code: "otp_disabled" }), /Register/);
  assert.match(learnerOtpMessage({ code: "otp_expired" }), /expired/);
  assert.match(learnerOtpMessage({ status: 429 }), /wait/);
  assert.doesNotMatch(
    learnerOtpMessage({ message: "private server diagnostic" }),
    /private server/,
  );
});
