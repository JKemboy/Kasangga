import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("overview shortcuts use formal case records and evidence validation remains constrained", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  try {
    const { default: Overview } = await server.ssrLoadModule(
      "/src/components/osas/OsasOverview.jsx",
    );
    const { validateEvidence, default: Shortcut } = await server.ssrLoadModule(
      "/src/components/osas/CaseShortcut.jsx",
    );
    const { loadOsasCases } = await server.ssrLoadModule(
      "/src/components/osas/OsasCases.jsx",
    );
    const { default: Provider } = await server.ssrLoadModule(
      "/src/components/shared/InteractionProvider.jsx",
    );
    const html = renderToStaticMarkup(
      createElement(Overview, {
        rows: [],
        settings: { dateFormat: "iso" },
        onClearance: () => {},
      }),
    );
    assert.doesNotMatch(html, /CASE-2026-017/);
    assert.deepEqual(loadOsasCases(), []);
    const record = {caseId:"TEST-1", id:"IR-TEST", status:"Open", type:"Test incident", student:"Student", reporter:"Reporter", history:[]};
    const drawer = renderToStaticMarkup(
      createElement(
        Provider,
        null,
        createElement(Shortcut, {
          record,
          onClose: () => {},
          onSave: () => true,
        }),
      ),
    );
    assert.match(drawer, /ocx-drawer/);
    assert.doesNotMatch(drawer, /EVD-2026-045/);
    assert.match(drawer, /Incident Report ID/);
    const evidence = { id: "E1", status: "Pending Review", history: [] };
    assert.throws(
      () =>
        validateEvidence(evidence, "Validated", {}, "A sufficient review note"),
      /every criterion/,
    );
    assert.throws(
      () =>
        validateEvidence(
          { ...evidence, status: "Validated" },
          "Insufficient",
          {},
          "A sufficient review note",
        ),
      /read-only/,
    );
    const checks = Object.fromEntries(
      [
        "Readability",
        "Context Completeness",
        "Relevance to Case",
        "Source Verification",
        "Signs of Manipulation",
      ].map((c) => [
        c,
        c === "Source Verification" ? "Not applicable" : "Meets criterion",
      ]),
    );
    const reviewed = validateEvidence(
      evidence,
      "Validated",
      checks,
      "Reviewed source context and readability.",
    );
    assert.equal(reviewed.status, "Validated");
    assert.equal(reviewed.history.length, 1);
    assert.equal(evidence.history.length, 0);
  } finally {
    await server.close();
  }
});
