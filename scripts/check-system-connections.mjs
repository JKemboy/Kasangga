import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
const root = process.argv[2];
assert.ok(root, "Provide temporary Supabase inventory directory");
const read = (name) =>
  JSON.parse(readFileSync(join(root, name), "utf8").replace(/^\uFEFF/, ""));
const functions = read("functions.json").rows;
const tables = new Set(read("tables.json").rows.map((row) => row.table_name));
const deployed = read("edge-functions.json");
const functionNames = new Set(functions.map((row) => row.proname));
const calls = new Set(),
  references = new Set(),
  edges = new Set();
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(jsx?|tsx?)$/.test(path)) {
      const text = readFileSync(path, "utf8");
      const rpcPattern =
        /(?:\.rpc|(?<![\w.])chatRequest)\(\s*["']([a-z][a-z_]+)["']/g;
      for (const match of text.matchAll(rpcPattern)) calls.add(match[1]);
      if (/osweCaseWorkflow\.js$|tutorInformation\.js$/.test(path))
        for (const match of text.matchAll(
          /\brequest\(\s*["']([a-z][a-z_]+)["']/g,
        ))
          calls.add(match[1]);
      for (const match of text.matchAll(/\.from\(\s*["']([a-z][a-z_-]+)["']/g))
        references.add(match[1]);
      for (const match of text.matchAll(
        /functions\.invoke\(\s*["']([a-z][a-z_-]+)["']/g,
      ))
        edges.add(match[1]);
    }
  }
}
walk("src");
for (const name of [
  "submit_incident_report",
  "attach_incident_evidence",
  "review_tutor_application_with_grades",
  "review_tutor_application",
  "confirm_learner_session_completion",
  "remind_learner_session_completion",
  "get_portal_avatar",
  "read_pair_chat_messages",
  "chat_booking_details",
])
  calls.add(name);
const missing = [...calls].filter((name) => !functionNames.has(name));
const denied = [...calls].filter(
  (name) =>
    functionNames.has(name) &&
    !functions.some((row) => row.proname === name && row.authenticated_execute),
);
const missingTables = [...references].filter(
  (name) => !tables.has(name) && !tables.has(`storage:${name}`),
);
const missingEdges = [...edges].filter(
  (name) => !deployed.some((fn) => fn.slug === name && fn.status === "ACTIVE"),
);
console.log(
  JSON.stringify(
    {
      rpcCount: calls.size,
      tableAndBucketReferences: references.size,
      edgeFunctions: [...edges],
      missingRpc: missing,
      deniedRpc: denied,
      missingTablesOrBuckets: missingTables,
      missingOrInactiveEdgeFunctions: missingEdges,
    },
    null,
    2,
  ),
);
assert.deepEqual(missing, []);
assert.deepEqual(denied, []);
assert.deepEqual(missingTables, []);
assert.deepEqual(missingEdges, []);
