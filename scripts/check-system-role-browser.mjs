import {
  caseBrowserFixture,
  checkCaseBrowser,
} from "./oswe-case-browser-fixture.mjs";
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
const ratingAudit = process.argv.includes("--tutor-ratings");
const caseAudit = process.argv.includes("--oswe-case-review");
const badgeAudit = process.argv.includes("--lco-badges");
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
    if (badgeAudit && role !== "lco") continue;
    if (caseAudit && role !== "oswe") continue;
    if (ratingAudit && role !== "tutor") continue;
    const ratingRows = [];
    if (ratingAudit) {
      const profile = catalog.tutor_profiles.find(
        (p) => p.user_id === payload.user_id,
      );
      assert.ok(profile, "Tutor fixture profile required");
      catalog.services = [900001, 900002].map((id) => ({
        service_id: id,
        tutor_profile_id: profile.tutor_profile_id,
        title: "Identical service title",
        subject: "ITE fixture",
        description: "Browser-only ratings fixture",
        category: "Computer Science",
        level: "All Levels",
        rate_per_hour: 100,
        session_type: "online",
        service_status: "active",
        created_at: "2026-11-11T00:00:00Z",
      }));
      catalog.service_topics = catalog.services.flatMap((service) =>
        [0, 1].map((i) => ({
          topic_id: service.service_id * 10 + i,
          service_id: service.service_id,
          topic_name: i ? "Current topic B" : "Renamed topic A",
          rate_per_hour: 100,
          session_type: "online",
          is_active: true,
        })),
      );
      ratingRows.push(
        ...[5, 3].map((rating, i) => ({
          review_id: 900001 + i,
          learner_name: "Review fixture",
          rating,
          review_text: "Browser-only review fixture",
          reviewed_at: "2026-11-11T00:00:00Z",
          service_id: 900001,
          service_title: "Old title snapshot",
          topic: i ? null : "Previous topic name",
        })),
      );
    }
    const caseFixture = caseAudit
      ? caseBrowserFixture(payload.snapshot, payload.user_id)
      : null;
    const noticeRows = badgeAudit
      ? [
          ...[900001, 900002].map((id) => ({
            notification_id: id,
            user_id: payload.user_id,
            notification_type: "incident_submitted",
            related_entity_type: "incident_reports",
            related_entity_id: id,
            title: "Incident report submitted",
            message: "A report awaits LCO review.",
            is_read: false,
            created_at: "2026-11-11T08:00:00Z",
          })),
          {
            notification_id: 900003,
            user_id: payload.user_id,
            notification_type: "payment_received",
            related_entity_type: "payments",
            related_entity_id: 900003,
            title: "Payment received",
            message: "A payment awaits review.",
            is_read: false,
            created_at: "2026-11-11T08:00:00Z",
          },
        ]
      : null;
    let rejectRead = false;
    if (badgeAudit)
      catalog.incident_reports = [900001, 900002].map((id) => ({
        report_id: id,
        reported_by: payload.user_id,
        reported_against: catalog.users.find(
          (u) => u.user_id !== payload.user_id,
        ).user_id,
        incident_type: "No-Show",
        incident_category: "Session / Payment Issue",
        description: "Rollback-free browser-only report fixture.",
        priority: "normal",
        report_status: "submitted",
        osas_referral_status: "not_referred",
        submitted_at: "2026-11-11T08:00:00Z",
      }));
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
      if (
        caseAudit &&
        url.pathname.startsWith("/storage/v1/object/sign/") &&
        request.method() === "GET"
      )
        return route.fulfill({
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      if (url.pathname.startsWith("/storage/v1/"))
        return send({ signedURL: "/object/sign/ui-fixture" });
      const rpc = url.pathname.split("/rpc/")[1];
      if (rpc) {
        if (ratingAudit && rpc === "list_tutor_service_reviews")
          return send(ratingRows);
        if (caseFixture) {
          const value = caseFixture.rpc(rpc, request.postDataJSON() || {});
          if (value) return send(value.data, value.status || 200);
        }

        const rpcData = {
          admin_dashboard_snapshot: catalog,
          oswe_case_review_snapshot: roles.find((r) => r.role === "oswe")
            .payload.snapshot,
          osas_dashboard_snapshot: roles.find((r) => r.role === "oswe").payload
            .snapshot,
          list_my_paid_learner_sessions: payload.learner_sessions || [],
          list_my_paid_tutor_sessions: payload.tutor_sessions || [],
          list_my_learner_reviews: payload.reviews || [],
          find_tutor_services: payload.services || [],
          my_reports_snapshot: payload.reports || { created: [], received: [] },
          my_reports_with_pending: payload.reports || {
            created: [],
            received: [],
          },
          list_my_pair_chats:
            payload.chats?.[0] instanceof Array
              ? payload.chats[0]
              : payload.chats || [],
          list_my_message_notifications: payload.message_notifications || [],
          get_my_tutor_information: payload.tutor_information || {},
          get_service_topic_settings: catalog.service_topics || [],
          get_tutor_completed_sessions: 0,
          list_tutor_reviews: [],
          list_tutor_service_reviews: [],
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
      if (caseFixture && table === "oswe_escalation_rules")
        return send(caseFixture.mappings);
      if (table) {
        if (
          badgeAudit &&
          table === "notifications" &&
          request.method() === "PATCH"
        ) {
          if (rejectRead)
            return send({ message: "Read-state save failed" }, 403);
          const ids = (url.searchParams.get("notification_id") || "")
            .slice(4, -1)
            .split(",");
          const changed = noticeRows.filter((row) =>
            ids.includes(String(row.notification_id)),
          );
          changed.forEach((row) => {
            row.is_read = true;
          });
          return send(
            changed.map((row) => ({ notification_id: row.notification_id })),
          );
        }
        if (request.method() !== "GET")
          return send({ message: "UI audit blocks writes" }, 403);
        let rows =
          badgeAudit && table === "notifications"
            ? noticeRows
            : table === "users"
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
    const activeSections = ratingAudit
      ? ["services"]
      : caseAudit
        ? ["Case Review"]
        : badgeAudit
          ? ["Overview"]
          : process.argv.includes("--mobile-only")
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
    if (ratingAudit) {
      const groups = page
        .getByRole("table", { name: "Tutoring services", exact: true })
        .locator("tbody");
      await groups
        .nth(0)
        .getByText("4.0 (2 ratings)", { exact: true })
        .waitFor();
      assert.equal(
        await groups
          .nth(0)
          .getByText("4.0 (2 ratings)", { exact: true })
          .count(),
        1,
        "Service aggregate must not repeat on each topic row",
      );
      assert.equal(
        await groups
          .nth(1)
          .getByText("No ratings yet", { exact: true })
          .count(),
        1,
        "Same-title services must not share reviews",
      );
      assert.match(await groups.nth(0).innerText(), /Renamed topic A/);
      ratingRows.push({ ...ratingRows[0], review_id: 900003, rating: 4 });
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await groups
        .nth(0)
        .getByText("4.0 (3 ratings)", { exact: true })
        .waitFor();
      ratingRows[0].rating = 1;
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await groups
        .nth(0)
        .getByText("2.7 (3 ratings)", { exact: true })
        .waitFor();
      await groups
        .nth(0)
        .getByRole("button", { name: "View Details", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByText("2.7 (3 ratings)", { exact: true })
        .waitFor();
      console.log(
        "PASS: Real review mapping, renamed/missing topics, same-title service isolation, updated average/count on refresh and matching View Details.",
      );
    }
    if (caseAudit) await checkCaseBrowser(page, caseFixture, root, base);
    if (badgeAudit) {
      const sidebar = page.locator("aside").first();
      const incidents = sidebar.getByRole("button", {
        name: /^Incident Reports/,
      });
      const payments = sidebar.getByRole("button", {
        name: /^Payments & Transactions/,
      });
      const notifications = sidebar.getByRole("button", {
        name: /^Notifications/,
      });
      const badge = (button, count) =>
        button.getByLabel(`${count} unread notifications`);
      await badge(incidents, 2).waitFor();
      await badge(notifications, 3).waitFor();
      await incidents.click();
      await page.locator(".ai-table tbody tr").first().waitFor();
      assert.equal(
        await badge(incidents, 2).count(),
        1,
        "Opening the section must not mark unseen records read",
      );
      const first = () =>
        page
          .locator(".ai-table tbody tr")
          .filter({ hasText: "900001" })
          .getByRole("button", { name: "View Report", exact: true });
      rejectRead = true;
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === "PATCH" &&
            response.url().includes("notifications"),
        ),
        first().click(),
      ]);
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await badge(incidents, 2).count(),
        1,
        "Failed database writes must preserve the unread badge",
      );
      await page
        .getByRole("button", { name: "Close incident details" })
        .click();
      rejectRead = false;
      await first().click();
      await badge(incidents, 1).waitFor();
      await badge(notifications, 2).waitFor();
      await badge(payments, 1).waitFor();
      await page
        .getByRole("button", { name: "Close incident details" })
        .click();
      await page.reload();
      await badge(incidents, 1).waitFor();
      await incidents.click();
      await page
        .locator(".ai-table tbody tr")
        .filter({ hasText: "900002" })
        .getByRole("button", { name: "View Report", exact: true })
        .click();
      await page.waitForFunction(() => {
        const button = [...document.querySelectorAll("aside button")].find(
          (b) => b.textContent.includes("Incident Reports"),
        );
        return button && !button.querySelector(".portal-count-badge");
      });
      await badge(notifications, 1).waitFor();
      await badge(payments, 1).waitFor();
      assert.deepEqual(
        noticeRows
          .filter((row) => !row.is_read)
          .map((row) => row.notification_id),
        [900003],
      );
      console.log(
        "PASS: section visits preserve badges; failed writes preserve unread state; opening each report clears only its badge and persists across reload.",
      );
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
