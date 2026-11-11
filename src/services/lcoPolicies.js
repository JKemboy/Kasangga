import { getSupabaseClient } from "./supabaseClient.js";
import { catalogPolicies, osweProcedures } from "./osweProcedures.js";

export function mapPolicy(row) {
  return {
    id: `POL-${row.policy_id}`,
    policyId: row.policy_id,
    scope: row.policy_scope || "institutional",
    title: row.title,
    category: row.category || "",
    version: row.version || "",
    effective: row.effective_date || "",
    added: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-CA", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "",
    owner: row.document_owner || "",
    status: String(row.status || "draft").replace(/^./, (c) => c.toUpperCase()),
    updated: row.updated_at?.slice(0, 10) || "",
    updatedAt: row.updated_at,
    documentPath: row.document_path || "",
    content: row.content || "",
  };
}

export async function listLcoPolicies(client = getSupabaseClient()) {
  const { data, error } = await client
    .from("policies")
    .select("*")
    .order("policy_id");
  if (error) throw new Error(error.message);
  return catalogPolicies((data || []).map(mapPolicy));
}

export function validatePolicy(value) {
  if (
    !osweProcedures.some((procedure) => procedure.title === value.title?.trim())
  )
    throw new Error(
      "Choose one of the ten documented procedures. Procedure titles follow the reference document.",
    );
  if (
    !value.title?.trim() ||
    !value.category?.trim() ||
    !value.version?.trim() ||
    !value.owner?.trim() ||
    !value.content?.trim()
  )
    throw new Error(
      "Complete the title, category, version, document owner and policy content.",
    );
  if (!["Active", "Draft", "Archived"].includes(value.status))
    throw new Error("Choose a valid policy status.");
  if (value.status === "Active" && !value.effective)
    throw new Error("Active policies require an effective date.");
  if (value.documentPath && !/^https:\/\//i.test(value.documentPath))
    throw new Error("Use an HTTPS document URL.");
}

export async function saveLcoPolicy(value, client = getSupabaseClient()) {
  if (!Number.isSafeInteger(value?.policyId) || value.policyId < 1)
    throw new Error(
      "Choose an existing policy to edit. Adding policies is disabled.",
    );
  if (value.scope !== "system")
    throw new Error(
      "LCO can edit system policies only. University and student handbook policies are read-only.",
    );
  validatePolicy(value);
  const { data, error } = await client.rpc("save_admin_policy", {
    p_id: value.policyId || null,
    p_expected: value.updatedAt || null,
    p_value: {
      title: value.title.trim(),
      category: value.category.trim(),
      version: value.version.trim(),
      effective_date: value.effective || null,
      document_owner: value.owner.trim(),
      status: value.status.toLowerCase(),
      document_path: value.documentPath || null,
      content: value.content.trim(),
    },
  });
  if (error) throw new Error(error.message);
  return data;
}
