// Unconnected actions must not silently succeed using browser-only records.
export function requireBackendPersistence() {
  throw new Error(
    "This action is not connected to the database yet. Nothing was saved.",
  );
}
