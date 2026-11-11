import { writeFileSync } from "node:fs";
import { osweProcedures } from "../src/services/osweProcedures.js";
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const statements = osweProcedures
  .map((p) => {
    const content = `Basis: ${p.basis}\n\nSource: ${p.source}\n\n${p.content.slice(p.basis.length).trim()}`;
    return `UPDATE public.policies SET title=${quote(p.title)}, category=${quote(p.category)}, document_owner=${quote(p.owner)}, policy_scope=${quote(p.owner === "System" ? "system" : "institutional")}, version=${quote(p.version)}, effective_date=${quote(p.effective)}::date, content=${quote(content)}, updated_at=now() WHERE title IN (${[p.title, p.legacyTitle].filter(Boolean).map(quote).join(", ")});`;
  })
  .join("\n\n");
writeFileSync(
  "supabase/migrations/20261111170000_oswe_document_catalog.sql",
  `-- Align the ten OSWE reference procedures with the user-supplied document.\n-- Existing IDs and case references are preserved; other catalog records are retained.\nBEGIN;\n${statements}\nCOMMIT;\n`,
);
console.log(
  "Generated OSWE document catalog alignment (preserves existing policy IDs).",
);
