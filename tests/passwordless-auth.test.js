import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sendLearnerOtp,
  verifyLearnerOtp,
} from "../src/services/learnerOtp.js";
import { registerWithGoogle } from "../src/services/googleRegistration.js";
import { accountHome, isCsuEmail } from "../src/services/authAccount.js";
test("login normalizes email and never creates an account or sends a redirect", async () => {
  let request;
  const client = {
    auth: {
      signInWithOtp: async (value) => {
        request = value;
        return {};
      },
    },
  };
  assert.equal(
    await sendLearnerOtp(" Student@CARsu.edu.ph ", client),
    "student@carsu.edu.ph",
  );
  assert.deepEqual(request, {
    email: "student@carsu.edu.ph",
    options: { shouldCreateUser: false },
  });
  await assert.rejects(sendLearnerOtp("student@gmail.com", client), {
    code: "invalid_csu_email",
  });
});
test("unregistered users remain rejected", async () => {
  const error = { code: "user_not_found" };
  await assert.rejects(
    sendLearnerOtp("a@carsu.edu.ph", {
      auth: { signInWithOtp: async () => ({ error }) },
    }),
    (e) => e === error,
  );
});
test("verification requires email OTP and a matching authenticated session", async () => {
  let request;
  const session = {
    access_token: "test",
    user: { id: "user-id", email: "a@carsu.edu.ph" },
  };
  const client = {
    auth: {
      verifyOtp: async (value) => {
        request = value;
        return { data: { session } };
      },
    },
  };
  assert.equal(
    await verifyLearnerOtp("a@carsu.edu.ph", "123456", client),
    session,
  );
  assert.deepEqual(request, {
    email: "a@carsu.edu.ph",
    token: "123456",
    type: "email",
  });
  await assert.rejects(verifyLearnerOtp("a@carsu.edu.ph", "bad", client), {
    code: "invalid_otp_input",
  });
  await assert.rejects(
    verifyLearnerOtp("a@carsu.edu.ph", "123456", {
      auth: { verifyOtp: async () => ({ data: {} }) },
    }),
    { code: "missing_otp_session" },
  );
});
test("Google registration uses the shared auth API and dedicated return route", async () => {
  let request;
  await registerWithGoogle("http://localhost:5173", {
    auth: {
      signInWithOAuth: async (value) => {
        request = value;
        return {};
      },
    },
  });
  assert.equal(request.provider, "google");
  assert.equal(request.options.redirectTo, "http://localhost:5173/register");
  assert.equal(request.options.queryParams.hd, "carsu.edu.ph");
});
test("learner is the default destination and domain matching is exact", () => {
  assert.equal(accountHome(["tutor", "learner"]), "/learner-dashboard");
  assert.equal(accountHome(["tutor"]), "/tutor-dashboard");
  assert.equal(isCsuEmail("a@carsu.edu.ph.evil.test"), false);
});
