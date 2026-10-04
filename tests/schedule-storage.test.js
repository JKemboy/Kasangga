import test from "node:test";
import assert from "node:assert/strict";
import {
  scheduleImageError,
  MAX_IMAGE_SIZE,
} from "../src/services/ocrService.js";
import {
  uploadScheduleImage,
  downloadScheduleImage,
} from "../src/services/scheduleStorage.js";

test("schedule OCR accepts only nonempty supported images within 10 MB", () => {
  assert.ok(scheduleImageError(null));
  for (const type of ["image/jpeg", "image/png", "image/webp"])
    assert.equal(scheduleImageError({ type, size: MAX_IMAGE_SIZE }), "");
  for (const file of [
    { type: "application/pdf", size: 100 },
    { type: "image/png", size: 0 },
    { type: "image/png", size: MAX_IMAGE_SIZE + 1 },
  ])
    assert.ok(scheduleImageError(file));
});
const file = new File(["test"], "../../unsafe.png", { type: "image/png" });
function client(userId = "user-1", uploadError = null) {
  const calls = [];
  return {
    calls,
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    storage: {
      from(bucket) {
        return {
          upload: async (...args) => {
            calls.push({ bucket, args });
            return { error: uploadError };
          },
          download: async () => {
            throw Error("Unexpected download");
          },
        };
      },
    },
  };
}
test("private upload uses verified user folder, unique names and no overwrites", async () => {
  const api = client();
  const a = await uploadScheduleImage(file, "user-1", api);
  const b = await uploadScheduleImage(file, "user-1", api);
  assert.match(a.storagePath, /^user-1\/[\da-f-]+\.png$/);
  assert.notEqual(a.storagePath, b.storagePath);
  assert.equal(api.calls[0].bucket, "schedule-uploads");
  assert.equal(api.calls[0].args[1], file);
  assert.equal(api.calls[0].args[2].upsert, false);
});
test("missing sessions, account changes and storage failures are surfaced", async () => {
  const anonymous = client(null);
  await assert.rejects(
    uploadScheduleImage(file, "user-1", anonymous),
    /Sign in/,
  );
  assert.equal(anonymous.calls.length, 0);
  const switched = client("user-2");
  await assert.rejects(
    uploadScheduleImage(file, "user-1", switched),
    /account changed/,
  );
  assert.equal(switched.calls.length, 0);
  await assert.rejects(
    uploadScheduleImage(
      file,
      "user-1",
      client("user-1", { message: "RLS denied" }),
    ),
    /RLS denied/,
  );
  await assert.rejects(
    downloadScheduleImage({ storagePath: "user-2/private.png" }, client()),
    /another account/,
  );
});
