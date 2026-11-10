// UI smoke tests use exported real records with mocked HTTP/auth, never live writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer, loadEnv } from "vite";
const root = process.argv[2];
assert.ok(root, "Provide temporary role exports and browser tools directory");
const read = (name) =>
  JSON.parse(readFileSync(join(root, name), "utf8").replace(/^\uFEFF/, ""));
const roles = read("role-snapshots.json").rows;
const extra = read("extras.json").rows[0].extra;
const catalog = roles.find((r) => r.role === "lco").payload.snapshot;
const env = loadEnv("development", process.cwd(), "");
const api = new URL(env.VITE_SUPABASE_URL);
const { chromium } = await import(
  pathToFileURL(join(root, "node_modules/playwright/index.mjs"))
);
const server = await createServer({
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const results = [];
const sections = {
  learner: [
    "dashboard",
    "find-tutor",
    "sessions",
    "messages",
    "saved-tutors",
    "reviews",
    "notifications",
    "profile",
    "reports",
    "help-support",
  ],
  tutor: [
    "dashboard",
    "services",
    "availability",
    "sessions",
    "messages",
    "earnings",
    "notifications",
    "profile",
    "reports",
    "help",
  ],
  lco: [
    "Overview",
    "User Management",
    "Tutor Verification",
    "Service Management",
    "Bookings Monitoring",
    "Messages",
    "Payments & Transactions",
    "Incident Reports",
    "Reports & Analytics",
    "Policies & Procedures",
    "Notifications",
    "Settings",
  ],
  oswe: [
    "Overview",
    "Case Review",
    "Student Clearance Review",
    "Policies & Procedures",
    "Case Archive",
    "Reports & Analytics",
    "Notifications",
    "Settings",
  ],
};
try {
  for (const { role, payload } of roles) {
    if (
      process.argv.includes("--mobile-only") &&
      !["learner", "tutor"].includes(role)
    )
      continue;
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    const runtime = [];
    const unknownRpc = new Set();
    const user = {
      id: payload.user_id,
      email: payload.profile.csu_email,
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at:
        payload.profile.email_verified_at || "2026-01-01T00:00:00Z",
      user_metadata: {},
      app_metadata: { provider: "google" },
    };
    const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.ui-fixture`;
    await context.addInitScript(
      ({ storageKey, session }) =>
        localStorage.setItem(storageKey, JSON.stringify(session)),
      {
        storageKey: `sb-${api.hostname.split(".")[0]}-auth-token`,
        session: {
          access_token: token,
          refresh_token: "ui-fixture",
          token_type: "bearer",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user,
        },
      },
    );
    await context.route(`${api.origin}/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const send = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (url.pathname.startsWith("/auth/v1/")) return send(user);
      if (url.pathname.startsWith("/storage/v1/"))
        return send({ signedURL: "/object/sign/ui-fixture" });
      const rpc = url.pathname.split("/rpc/")[1];
      if (rpc) {
        const rpcData = {
          admin_dashboard_snapshot: catalog,
          osas_dashboard_snapshot: roles.find((r) => r.role === "oswe").payload
            .snapshot,
          list_my_paid_learner_sessions: payload.learner_sessions || [],
          list_my_paid_tutor_sessions: payload.tutor_sessions || [],
          list_my_learner_reviews: payload.reviews || [],
          find_tutor_services: payload.services || [],
          my_reports_snapshot: payload.reports || { created: [], received: [] },
          list_my_pair_chats:
            payload.chats?.[0] instanceof Array
              ? payload.chats[0]
              : payload.chats || [],
          list_my_message_notifications: payload.message_notifications || [],
          get_my_tutor_information: payload.tutor_information || {},
          get_service_topic_settings: catalog.service_topics || [],
          get_tutor_completed_sessions: 0,
          list_tutor_reviews: [],
          lco_repeated_incident_candidates: [],
          get_tutor_class_blocks: [],
          get_tutor_booking_blocks: [],
          touch_chat_presence: null,
        };
        Object.assign(rpcData, {
          get_portal_avatar: null,
          read_pair_chat_messages: [],
          chat_booking_details: null,
        });
        if (!(rpc in rpcData)) {
          unknownRpc.add(rpc);
          return send({ message: "UI audit blocked an unconfigured RPC" }, 400);
        }
        return send(rpcData[rpc]);
      }
      const table = url.pathname.split("/rest/v1/")[1];
      if (table) {
        if (request.method() !== "GET")
          return send({ message: "UI audit blocks writes" }, 403);
        let rows =
          table === "users"
            ? [
                ...catalog.users.filter(
                  (row) => row.user_id !== payload.user_id,
                ),
                payload.profile,
              ]
            : table === "session_completion_proofs"
              ? payload.proofs || []
              : extra[table] || catalog[table] || [];
        if (table === "class_schedules")
          rows = rows.map((row) => ({
            ...row,
            class_schedule_entries: extra.class_schedule_entries.filter(
              (entry) => entry.class_schedule_id === row.class_schedule_id,
            ),
          }));
        if (table === "services")
          rows = rows.map((row) => ({
            ...row,
            service_topics: catalog.service_topics.filter(
              (topic) => topic.service_id === row.service_id,
            ),
          }));
        for (const [key, value] of url.searchParams) {
          if (value.startsWith("eq."))
            rows = rows.filter((row) => String(row[key]) === value.slice(3));
          if (value.startsWith("in.(")) {
            const values = value.slice(4, -1).split(",");
            rows = rows.filter((row) => values.includes(String(row[key])));
          }
        }
        if (url.searchParams.has("limit"))
          rows = rows.slice(0, Number(url.searchParams.get("limit")));
        return send(
          request.headers().accept?.includes("vnd.pgrst.object+json")
            ? rows[0] || null
            : rows,
        );
      }
      return send({ message: "Unconfigured UI audit endpoint" }, 400);
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => runtime.push(error.message));
    const activeSections = process.argv.includes("--mobile-only")
      ? ["sessions"]
      : sections[role];
    for (const section of activeSections) {
      await page.goto(
        `${base}/${role}-dashboard?section=${encodeURIComponent(section)}`,
      );
      await page.waitForFunction(
        () => !document.body.innerText.includes("Loading your account"),
      );
      await page.waitForTimeout(200);
      assert.ok(
        !(await page.getByText("Unexpected Application Error!").count()),
        `${role}/${section} crashed`,
      );
      assert.ok(
        !page.url().includes("/login"),
        `${role} unexpectedly redirected to login`,
      );
      if (section === "sessions") {
        const ongoing = page.getByRole("button", { name: /^Ongoing/ });
        if (await ongoing.count()) await ongoing.first().click();
        await page.screenshot({
          path: join(root, `${role}-sessions-desktop.png`),
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(250);
        assert.ok(
          await page
            .locator("aside")
            .first()
            .evaluate((element) => element.getBoundingClientRect().right <= 1),
          `${role} mobile sidebar obscures content`,
        );
        await page.screenshot({
          path: join(root, `${role}-sessions-mobile.png`),
        });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
          `${role} sessions overflow mobile viewport`,
        );
        await page.setViewportSize({ width: 1366, height: 900 });
      }
    }
    await page.screenshot({ path: join(root, `${role}-dashboard-ui.png`) });
    results.push({
      role,
      sections: activeSections.length,
      runtimeErrors: runtime,
      unconfiguredRpc: [...unknownRpc],
    });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
  assert.ok(
    results.every((result) => result.runtimeErrors.length === 0),
    "Role dashboard runtime errors detected",
  );
  assert.ok(
    results.every((result) => result.unconfiguredRpc.length === 0),
    "Complete the UI fixtures for newly discovered RPCs",
  );
} finally {
  await browser.close();
  await server.close();
}
