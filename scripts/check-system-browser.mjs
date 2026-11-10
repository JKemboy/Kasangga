import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
const auditRoot = process.argv[2];
assert.ok(auditRoot, "Provide temporary browser tools directory");
const { chromium } = await import(
  pathToFileURL(join(auditRoot, "node_modules/playwright/index.mjs"))
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
const failures = [];
const passed = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  page.on("pageerror", (error) => failures.push(error.message));
  for (const path of ["/login", "/register", "/terms"]) {
    await page.goto(base + path);
    await page.waitForFunction(() => document.body.innerText.length > 150);
    assert.ok(!(await page.getByText("Unexpected Application Error!").count()));
    passed.push(path);
  }
  for (const role of ["learner", "tutor", "lco", "oswe"]) {
    await page.goto(`${base}/${role}-dashboard`);
    await page.waitForURL("**/login");
    passed.push(`anonymous ${role} redirect`);
  }
  await page.goto(base + "/register");
  const trigger = page.getByRole("button", {
    name: "Terms & Conditions",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  assert.ok(
    (await dialog.innerText()).includes("Session proof and completion"),
  );
  await page.screenshot({ path: join(auditRoot, "terms-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await dialog.evaluate(
      (element) => element.getBoundingClientRect().width <= window.innerWidth,
    ),
  );
  await page.screenshot({ path: join(auditRoot, "terms-mobile.png") });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await page.getByRole("checkbox").isChecked(), false);
  passed.push(
    "Terms modal desktop/mobile, full content, consent remains manual",
  );
  assert.deepEqual(failures, []);
  console.log(JSON.stringify({ passed, runtimeErrors: failures }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
