import { createClient } from "npm:@supabase/supabase-js@2";

const reply = (message: string, status = 200) => {
  if (status >= 400) {
    console.error("WEBHOOK_RESULT:", status, message);
  }

  return Response.json({ message }, { status });
};

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySignature(
  body: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const fields: Record<string, string> = {};

  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index > 0) {
      fields[part.slice(0, index).trim()] =
        part.slice(index + 1).trim();
    }
  }

  const timestamp = fields.t;
  const signature = fields.te;

  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) return false;

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );

  const expected = Array.from(
    new Uint8Array(digest),
    byte => byte.toString(16).padStart(2, "0"),
  ).join("");

  return equalConstantTime(expected, signature.toLowerCase());
}

function checkoutAmountCentavos(items: unknown): number | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  let total = 0;

  for (const item of items) {
    if (
      item?.currency !== "PHP" ||
      !Number.isSafeInteger(item?.amount) ||
      !Number.isSafeInteger(item?.quantity) ||
      item.amount <= 0 ||
      item.quantity <= 0
    ) return null;

    total += item.amount * item.quantity;

    if (!Number.isSafeInteger(total)) return null;
  }

  return total;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return reply("Method not allowed", 405);
  }

  const signingSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  const paymongoKey = Deno.env.get("PAYMONGO_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!signingSecret || !paymongoKey || !supabaseUrl || !serviceKey) {
    console.error("Missing webhook configuration");
    return reply("Server configuration missing", 500);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("Paymongo-Signature") ?? "";

  if (!(await verifySignature(rawBody, signature, signingSecret))) {
    return reply("Invalid signature", 401);
  }

  let event: any;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return reply("Invalid JSON", 400);
  }

  const eventInfo = event?.data?.attributes;

  if (eventInfo?.type !== "checkout_session.payment.paid") {
    return reply("Event ignored");
  }

  if (eventInfo?.livemode !== false) {
    return reply("Not a test-mode event", 400);
  }

  const eventCheckout = eventInfo?.data;
  const checkoutId = eventCheckout?.id;

  if (
    typeof checkoutId !== "string" ||
    !/^cs_[a-zA-Z0-9]+$/.test(checkoutId)
  ) {
    return reply("Invalid checkout ID", 400);
  }

  // Only the stored CampusTutor checkout session may be finalized.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: paymentRow, error: lookupError } = await admin
    .from("payments")
    .select("booking_id,gross_amount,payment_status")
    .eq("paymongo_checkout_session_id", checkoutId)
    .maybeSingle();

  if (lookupError) {
    console.error("Payment lookup:", lookupError.code);
    return reply("Payment lookup failed", 500);
  }

  if (!paymentRow) {
    return reply("Unknown checkout session", 404);
  }

  // Verify the checkout with PayMongo independently.
  let verified: any;

  try {
    const response = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${checkoutId}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${paymongoKey}:`)}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      console.error("PayMongo verification HTTP:", response.status);
      return reply("PayMongo verification unavailable", 503);
    }

    verified = await response.json();
  } catch {
    return reply("PayMongo verification unavailable", 503);
  }

  const checkout = verified?.data;
  const attributes = checkout?.attributes;

  if (
    checkout?.id !== checkoutId ||
    attributes?.livemode !== false ||
    attributes?.payment_intent?.attributes?.status !== "succeeded"
  ) {
    return reply("Checkout not verified as paid", 409);
  }

  const expectedCentavos =
    Math.round(Number(paymentRow.gross_amount) * 100);

  const actualCentavos =
    checkoutAmountCentavos(attributes?.line_items);

  if (
    !Number.isSafeInteger(expectedCentavos) ||
    expectedCentavos <= 0 ||
    actualCentavos !== expectedCentavos
  ) {
    return reply("Checkout amount mismatch", 409);
  }

  const payments = attributes?.payments;

  if (!Array.isArray(payments)) {
    return reply("Missing payment details", 409);
  }

  const paidPayment = payments.find((item: any) =>
    typeof item?.id === "string" &&
    item.id.startsWith("pay_") &&
    item?.attributes?.status === "paid"
  );

  if (!paidPayment) {
    return reply("No verified paid payment", 409);
  }

  // The RPC must be restricted to the service_role.
  const { error: finalizeError } = await admin.rpc(
    "finalize_campustutor_payment",
    { p_checkout_session_id: checkoutId },
  );

  if (finalizeError) {
    console.error("Finalization:", finalizeError.code);
    return reply("Payment finalization failed", 500);
  }

  const { error: updateError } = await admin
    .from("payments")
    .update({ paymongo_payment_id: paidPayment.id })
    .eq("paymongo_checkout_session_id", checkoutId);

  if (updateError) {
    console.error("Payment ID update:", updateError.code);
    return reply("Payment ID update failed", 500);
  }

  return reply("Payment verified and recorded");
});
