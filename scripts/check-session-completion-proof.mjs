import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  validateCompletionProof,
  uploadCompletionProof,
  confirmLearnerCompletion,
  attachCompletionProofs,
} from "../src/services/tutorSessionCompletion.js";
for (const file of [
  null,
  { type: "text/html", size: 1 },
  { type: "image/png", size: 0 },
  { type: "image/png", size: 10485761 },
])
  assert.throws(() => validateCompletionProof(file));
validateCompletionProof({ type: "image/png", size: 100 });
const calls = [];
const fake = {
  auth: { getUser: async () => ({ data: { user: { id: "tutor" } } }) },
  storage: {
    from: (bucket) => ({
      upload: async (path, file) => {
        calls.push(["upload", bucket, path]);
        return {};
      },
      remove: async (paths) => {
        calls.push(["cleanup", paths]);
        return {};
      },
    }),
  },
  rpc: async (name, args) => {
    calls.push([name, args]);
    return {};
  },
};
await uploadCompletionProof(
  9,
  { type: "image/png", size: 10, name: "proof.png" },
  fake,
);
assert.equal(calls[0][0], "upload");
assert.equal(calls[1][0], "submit_session_completion_proof");
assert.equal(calls[1][1].p_path, calls[0][2]);
await confirmLearnerCompletion(9, fake);
assert.equal(calls[2][0], "confirm_learner_session_completion");
fake.rpc = async () => ({ error: { message: "Booking not eligible" } });
await assert.rejects(
  uploadCompletionProof(
    9,
    { type: "image/png", size: 10, name: "proof.png" },
    fake,
  ),
  /Booking not eligible/,
);
assert.equal(calls.at(-1)[0], "cleanup");
const proof = {
  booking_id: 9,
  storage_path: "tutor/9/proof.png",
  file_name: "proof.png",
  uploaded_at: new Date().toISOString(),
  learner_confirmed_at: null,
};
const readClient = {
  from: () => ({ select: () => ({ in: async () => ({ data: [proof] }) }) }),
};
const rows = await attachCompletionProofs(
  [{ booking_id: 9 }, { booking_id: 10 }],
  readClient,
);
assert.equal(rows[0].completionProof, proof);
assert.equal(rows[1].completionProof, null);
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  const { default: Component } = await server.ssrLoadModule(
    "/src/components/shared/SessionCompletionProof.jsx",
  );
  const render = (props) =>
    renderToStaticMarkup(
      React.createElement(Component, { bookingId: 9, ...props }),
    );
  assert.ok(!render({ proof: null }).includes("Confirm session completion"));
  const learner = render({ proof });
  assert.ok(learner.includes("Confirm session completion"));
  assert.ok(learner.includes('disabled=""'));
  assert.ok(!learner.includes("Remind learner"));
  const tutor = render({ proof, tutor: true });
  assert.ok(tutor.includes("Remind learner"));
  assert.ok(!tutor.includes("Confirm session completion"));
  assert.ok(
    !render({
      proof: { ...proof, learner_confirmed_at: new Date().toISOString() },
    }).includes("Confirm session completion"),
  );
  console.log(
    "PASS: proof validation, upload/register ordering, cleanup, learner confirmation RPC, role-specific proof UI and proof mapping.",
  );
} finally {
  await server.close();
}
