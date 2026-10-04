// One-time reset requested before connecting the application to a database.
export function resetDemoData(storage) {
  const marker = "campustutor:empty-workspaces:v1";
  if (storage.getItem(marker)) return;
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
  for (const key of keys) {
    if (key?.startsWith("campustutor:")) storage.removeItem(key);
  }
  storage.setItem(marker, "done");
}

if (typeof window !== "undefined") {
  try {
    const firstReset = !window.localStorage.getItem("campustutor:empty-workspaces:v1");
    resetDemoData(window.localStorage);
    if (firstReset && window.indexedDB) {
      window.indexedDB.deleteDatabase("campustutor-schedule-uploads");
    }
  } catch {
    // Storage may be disabled; empty defaults still work in memory.
  }
}
