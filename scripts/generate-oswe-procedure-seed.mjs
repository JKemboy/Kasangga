import { writeFileSync } from "node:fs";
import { osweProcedures } from "../src/services/osweProcedures.js";
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const rows = osweProcedures
  .map(
    (p) =>
      `(${[p.title, p.category, p.owner, p.owner === "System" ? "system" : "institutional", `Basis: ${p.basis}\n\n${p.content}`].map(quote).join(", ")})`,
  )
  .join(",\n");
writeFileSync(
  "supabase/migrations/202611110001_oswe_procedure_catalog.sql",
  `-- Add the reviewed OSWE catalog without overwriting existing content or references.
-- Mapping source: src/services/osweProcedures.js. No disciplinary enforcement changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.policies IN SHARE ROW EXCLUSIVE MODE;
-- Retain the catalog's existing creator for this maintenance seed (required FK).
-- An empty installation must seed its authorized catalog administrator first.
INSERT INTO public.policies (title, category, document_owner, policy_scope, content, status, version, created_by)
SELECT seed.title, seed.category, seed.owner, seed.scope, seed.content, 'active', '2026',
  (SELECT created_by FROM public.policies ORDER BY policy_id LIMIT 1)
FROM (VALUES
${rows}
) AS seed(title, category, owner, scope, content)
WHERE NOT EXISTS (SELECT 1 FROM public.policies p WHERE lower(trim(p.title)) = lower(trim(seed.title)));
COMMIT;
`,
);
console.log("Generated idempotent OSWE procedure seed.");
