import { getSupabaseClient } from "./supabaseClient.js";

// Replace these adapters when connecting the database/auth/payment services.
// Never manufacture provider confirmations, password changes, or OTPs.
const adapters = new Map();
export function configurePortalApi(services) {
  for (const [name, fn] of Object.entries(services)) {
    if (typeof fn !== "function")
      throw new TypeError(`${name} must be a function`);
    adapters.set(name, fn);
  }
  return () => {
    for (const name of Object.keys(services)) adapters.delete(name);
  };
}
export function portalApiAvailable(name) {
  return adapters.has(name);
}
export async function portalApi(name, payload, options) {
  const handler = adapters.get(name);
  if (!handler)
    throw new Error(
      `${name} is not connected yet. No server-side change was made.`,
    );
  return handler(payload, options);
}

async function functionErrorMessage(error) {
  const fallback = error?.message || "Unable to start payment.";
  const response = error?.context;
  if (!response || typeof response.clone !== "function") return fallback;

  try {
    const body = await response.clone().json();
    if (typeof body?.error === "string" && body.error.trim()) return body.error;
  } catch {
    return fallback;
  }
  return fallback;
}

export function connectBookingApi() {
  return configurePortalApi({
    async discardUnpaidCheckout() {
      const { data, error } = await getSupabaseClient().functions.invoke(
        "create-payment",
        { body: { action: "discardUnpaidCheckout" } },
      );
      if (error) throw new Error(await functionErrorMessage(error));
      return data;
    },
    async createBooking(payload) {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.functions.invoke(
        "create-payment",
        {
          body: payload,
        },
      );

      if (error) {
        throw new Error(await functionErrorMessage(error));
      }

      if (!data?.checkoutUrl) {
        throw new Error("Payment checkout URL was not returned.");
      }

      return data;
    },
  });
}
