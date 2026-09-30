import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SCHEDULE_FILE_SIZE,
  saveScheduleDraft,
  scheduleFileError,
} from "../src/components/tutor/workspace/scheduleUploads.js";

const file = () =>
  new File(["sample schedule"], "schedule.pdf", { type: "application/pdf" });

function memoryStorage() {
  const files = new Map();
  return {
    files,
    async save(id, value) {
      files.set(id, value);
    },
    async remove(id) {
      files.delete(id);
    },
  };
}

test("schedule validation accepts supported nonempty files up to exactly 10 MB", () => {
  for (const type of ["image/png", "image/jpeg", "application/pdf"]) {
    assert.equal(scheduleFileError({ type, size: 1 }), "");
    assert.equal(scheduleFileError({ type, size: MAX_SCHEDULE_FILE_SIZE }), "");
  }
  assert.match(scheduleFileError(null), /Choose/);
  assert.match(
    scheduleFileError({ type: "text/plain", size: 10 }),
    /PNG, JPEG, or PDF/,
  );
  assert.match(scheduleFileError({ type: "image/png", size: 0 }), /empty/);
  assert.match(scheduleFileError({ type: "image/png", size: NaN }), /empty/);
  assert.match(
    scheduleFileError({ type: "image/png", size: MAX_SCHEDULE_FILE_SIZE + 1 }),
    /10 MB/,
  );
});

test("saving commits file content before appending metadata and preserves previous data", async () => {
  const storage = memoryStorage();
  const selected = file();
  const original = {
    uploads: [{ id: "old", name: "old.pdf" }],
    classes: ["confirmed"],
    slots: ["available"],
  };
  let data = original;
  const result = await saveScheduleDraft(
    selected,
    (change) => {
      assert.equal(storage.files.get("new"), selected);
      data = change(data);
      return true;
    },
    { storage, id: "new", created: "2026-09-23T10:00:00.000Z" },
  );
  assert.deepEqual(result, {
    id: "new",
    name: selected.name,
    size: selected.size,
    type: selected.type,
    created: "2026-09-23T10:00:00.000Z",
    status: "Draft",
  });
  assert.deepEqual(data.uploads, [original.uploads[0], result]);
  assert.equal(original.uploads.length, 1);
  assert.equal(data.classes, original.classes);
  assert.equal(data.slots, original.slots);
  assert.equal(await storage.files.get("new").text(), "sample schedule");
});

test("failed file writes never create upload metadata", async () => {
  let updates = 0;
  await assert.rejects(
    saveScheduleDraft(
      file(),
      () => {
        updates += 1;
        return true;
      },
      {
        id: "new",
        storage: {
          save: async () => {
            throw new Error("Storage unavailable");
          },
        },
      },
    ),
    /Storage unavailable/,
  );
  assert.equal(updates, 0);
});

test("metadata failures remove the newly stored file and report failure", async () => {
  for (const update of [
    () => false,
    () => {
      throw new Error("Metadata quota");
    },
  ]) {
    const storage = memoryStorage();
    const existing = file();
    storage.files.set("old", existing);
    await assert.rejects(
      saveScheduleDraft(file(), update, { storage, id: "new" }),
    );
    assert.equal(storage.files.has("new"), false);
    assert.equal(storage.files.get("old"), existing);
  }
});

test("closing during a file write cancels metadata save and removes the draft file", async () => {
  const storage = memoryStorage();
  let updates = 0;
  const result = await saveScheduleDraft(
    file(),
    () => {
      updates += 1;
      return true;
    },
    {
      storage,
      id: "new",
      isCancelled: () => true,
    },
  );
  assert.equal(result, null);
  assert.equal(updates, 0);
  assert.equal(storage.files.size, 0);
});

test("invalid files cannot reach storage or metadata updates", async () => {
  let writes = 0;
  let updates = 0;
  await assert.rejects(
    saveScheduleDraft(
      new File([], "empty.pdf", { type: "application/pdf" }),
      () => {
        updates += 1;
        return true;
      },
      {
        id: "new",
        storage: {
          save: async () => {
            writes += 1;
          },
        },
      },
    ),
    /empty/,
  );
  assert.equal(writes, 0);
  assert.equal(updates, 0);
});
