import assert from "node:assert/strict";
import { loadEnv } from "vite";
const env = loadEnv("development", process.cwd(), "");
const base = env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "");
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
assert.ok(base && key, "Supabase browser configuration is required");
const results = [];
async function check(
  name,
  path,
  { method = "GET", body, headers = {}, accept } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      apikey: key,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => null);
  const ok = accept ? accept(response, data) : response.ok;
  results.push({ name, status: response.status, passed: ok });
  return data;
}
await check(
  "Auth settings / OAuth provider configuration",
  "/auth/v1/settings",
  {
    accept: (response, data) => response.ok && data?.external?.google === true,
  },
);
await check(
  "Deployed Edge Function health",
  "/functions/v1/webhook-health-check",
  {
    headers: { Authorization: `Bearer ${key}` },
    accept: (response, data) => response.ok && data?.status === "ok",
  },
);
await check(
  "Checkout rejects unauthenticated caller",
  "/functions/v1/create-payment",
  {
    method: "POST",
    body: {},
    headers: {
      Authorization: `Bearer ${key}`,
      Origin: "https://kasangga-test.vercel.app",
    },
    accept: (response) => response.status === 401 || response.status === 403,
  },
);
await check(
  "Unsigned payment webhook rejected",
  "/functions/v1/paymongo-webhook",
  {
    method: "POST",
    body: {},
    accept: (response) => [400, 401, 403].includes(response.status),
  },
);
await check(
  "Email worker rejects invalid secret",
  "/functions/v1/transactional-emails",
  {
    method: "POST",
    body: {},
    headers: { "x-email-worker-secret": "system-audit-invalid-secret" },
    accept: (response) => [401, 403].includes(response.status),
  },
);
await check(
  "LCO RPC rejects anonymous HTTP caller",
  "/rest/v1/rpc/admin_dashboard_snapshot",
  {
    method: "POST",
    body: {},
    accept: (response) => [400, 401, 403].includes(response.status),
  },
);
await check(
  "OSWE RPC rejects anonymous HTTP caller",
  "/rest/v1/rpc/osas_dashboard_snapshot",
  {
    method: "POST",
    body: {},
    accept: (response) => [400, 401, 403].includes(response.status),
  },
);
console.log(JSON.stringify(results, null, 2));
assert.ok(
  results.every((result) => result.passed),
  "One or more live HTTP checks failed",
);
