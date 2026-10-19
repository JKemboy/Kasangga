import fs from "node:fs";
import { collegeProgramMap } from "../src/services/collegeProgramMap.js";

// Generate the RPC's allow-list from the same catalogue used in the browser.
// This writes a manual SQL file only; it never executes against Supabase.
const file = new URL(
  "../supabase/manual/learner_profile_setup.sql",
  import.meta.url,
);
const pairs = collegeProgramMap.flatMap((c) =>
  c.programs.map((p) => [c.name, p.name]),
);
const block = `  -- BEGIN GENERATED ACADEMIC VALIDATION (scripts/generate-academic-validation.mjs)
  catalogue := $catalogue$${JSON.stringify(pairs)}$catalogue$::jsonb;
  if not exists (
    select 1 from jsonb_array_elements(catalogue) as pair
    where pair->>0 = details->>'college' and pair->>1 = details->>'program'
  ) then raise exception 'Select a valid college and its corresponding program'; end if;
  -- END GENERATED ACADEMIC VALIDATION
`;
let sql = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const marker =
  /  -- BEGIN GENERATED ACADEMIC VALIDATION[^\n]*\n[\s\S]*?  -- END GENERATED ACADEMIC VALIDATION\n?/;
if (!marker.test(sql)) {
  throw new Error(
    `Generated validation markers were not found in ${file.pathname}. Refusing to modify the SQL function.`,
  );
}
const updated = sql.replace(marker, block);
if (updated !== sql) fs.writeFileSync(file, updated);
console.log(`Updated academic validation in ${file.pathname}`);
