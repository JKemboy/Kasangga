import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadAdminGcashQr,
  saveAdminGcashQr,
  validateGcashQr,
} from "../src/services/adminGcashQr.js";

const file = { type: "image/png", size: 100 };
function mock({
  current = "qr/old.png",
  uploadError = null,
  saveError = null,
  cleanupError = null,
} = {}) {
  const calls = [];
  const bucket = {
    upload: async (path, image, options) => {
      calls.push(["upload", path, image, options]);
      return { error: uploadError };
    },
    remove: async (paths) => {
      calls.push(["remove", paths]);
      return { error: cleanupError };
    },
    createSignedUrl: async (path, seconds) => {
      calls.push(["sign", path, seconds]);
      return { data: { signedUrl: "https://signed.test/qr" } };
    },
  };
  const client = {
    storage: {
      from: (name) => {
        assert.equal(name, "gcash-qr");
        return bucket;
      },
    },
    rpc: async (name, args) => {
      calls.push(["save", name, args]);
      return { data: current, error: saveError };
    },
    from: (table) => {
      assert.equal(table, "system_settings");
      return {
        select: () => ({
          eq: (key, value) => {
            assert.equal(key, "setting_key");
            assert.equal(value, "gcash_qr_path");
            return {
              maybeSingle: async () => ({
                data: current ? { setting_value: current } : null,
              }),
            };
          },
        }),
      };
    },
  };
  return { client, calls };
}
test("accepts supported images and rejects empty, oversized or other files", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"])
    validateGcashQr({ ...file, type });
  for (const invalid of [
    null,
    { ...file, size: 0 },
    { ...file, size: 5242881 },
    { ...file, type: "image/svg+xml" },
  ])
    assert.throws(() => validateGcashQr(invalid));
});
test("loads one current setting using a private signed URL", async () => {
  const { client, calls } = mock();
  assert.deepEqual(await loadAdminGcashQr(client), {
    path: "qr/old.png",
    url: "https://signed.test/qr",
  });
  assert.deepEqual(calls, [["sign", "qr/old.png", 3600]]);
  assert.deepEqual(await loadAdminGcashQr(mock({ current: null }).client), {
    path: null,
    url: "",
  });
});
test("uploads first, swaps the single configuration, then removes the old image", async () => {
  const { client, calls } = mock();
  const result = await saveAdminGcashQr(file, "qr/old.png", client);
  assert.match(result.path, /^qr\/[0-9a-f-]{36}\.png$/);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["upload", "save", "remove"],
  );
  assert.deepEqual(calls[1].slice(1), [
    "save_admin_gcash_qr",
    { p_path: result.path, p_expected_path: "qr/old.png" },
  ]);
  assert.deepEqual(calls[2][1], ["qr/old.png"]);
  assert.equal(calls[0][3].upsert, false);
});
test("first upload creates no redundant cleanup", async () => {
  const { client, calls } = mock({ current: null });
  await saveAdminGcashQr(file, null, client);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["upload", "save"],
  );
});
test("an upload failure never changes the current configuration", async () => {
  const { client, calls } = mock({ uploadError: { message: "Denied" } });
  await assert.rejects(() => saveAdminGcashQr(file, null, client), /Denied/);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["upload"],
  );
});
test("a save conflict cleans up only the newly staged image", async () => {
  const { client, calls } = mock({ saveError: { message: "QR changed" } });
  await assert.rejects(
    () => saveAdminGcashQr(file, "qr/old.png", client),
    /QR changed/,
  );
  assert.deepEqual(calls[2][1], [calls[0][1]]);
});
test("cleanup failure reports successful save with a warning", async () => {
  const { client } = mock({ cleanupError: { message: "Unavailable" } });
  const result = await saveAdminGcashQr(file, "qr/old.png", client);
  assert.match(result.warning, /saved.*could not be removed/);
});
