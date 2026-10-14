// Remove retired schedule caches only. Supabase authentication is intentionally retained.
export function clearLegacyScheduleData(browser = globalThis) {
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage = browser[name];
      if (!storage) continue;
      const keys = Array.from({ length: storage.length }, (_, i) =>
        storage.key(i),
      );
      for (const key of keys) {
        if (/^campustutor:.*schedule/i.test(key || "")) storage.removeItem(key);
      }
    } catch {
      /* Storage can be disabled by the browser. */
    }
  }
  try {
    browser.indexedDB?.deleteDatabase("campustutor-schedule-uploads");
  } catch {
    /* No legacy database. */
  }
}
