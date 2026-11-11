import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { saveMyGcashAccount } from "../src/services/accountGcash.js";

const calls = [];
const client = {
  rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: { name: args.p_name, number: args.p_number }, error: null };
  },
};
assert.deepEqual(
  await saveMyGcashAccount(
    { name: " Test User ", number: "09123456789" },
    client,
  ),
  { name: "Test User", number: "+639123456789" },
);
assert.deepEqual(calls[0], {
  name: "save_my_gcash_account",
  args: { p_name: "Test User", p_number: "+639123456789" },
});
await assert.rejects(
  saveMyGcashAccount({ name: "User", number: "0912" }, client),
  /valid GCash/,
);
await assert.rejects(
  saveMyGcashAccount({ name: " ", number: "09123456789" }, client),
  /account name/,
);
assert.equal(calls.length, 1, "Invalid edits must not be submitted");
for (const file of [
  "src/components/learner/workspace/TutorProfile.jsx",
  "src/components/learner/find-tutors/TutorServiceCard.jsx",
  "src/services/tutorServices.js",
]) {
  assert.doesNotMatch(
    readFileSync(file, "utf8"),
    /OwnGcashAccount|account_gcash|gcash_number|gcash_name/,
  );
}
console.log(
  "PASS: GCash validation, normalized owner-only save arguments, and no GCash additions to public tutor views.",
);
