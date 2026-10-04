// Replace these adapters when connecting the database/auth/payment services.
// Never manufacture provider confirmations, password changes, or OTPs.
const adapters = new Map();
export function configurePortalApi(services) {
  for (const [name, fn] of Object.entries(services)) {
    if (typeof fn !== 'function') throw new TypeError(`${name} must be a function`);
    adapters.set(name, fn);
  }
  return () => { for (const name of Object.keys(services)) adapters.delete(name); };
}
export function portalApiAvailable(name) { return adapters.has(name); }
export async function portalApi(name, payload, options) {
  const handler = adapters.get(name);
  if (!handler) throw new Error(`${name} is not connected yet. No server-side change was made.`);
  return handler(payload, options);
}
