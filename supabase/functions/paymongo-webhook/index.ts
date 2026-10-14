import { createClient } from "npm:@supabase/supabase-js@2";

const json = (message: string, status = 200) => {
  if (status >= 400) {
    console.error("WEBHOOK_RESULT:", status, message);
  }

  return Response.json({ message }, { status });
};

function constantTimeEqual(a: string, b: string): boolean {
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
  const parts: Record<string, string> = {};

  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index > 0) {
      parts[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    }
  }

  const timestamp = parts.t;
  const signature = parts.te;

  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/i.test(signature)
  )
    return false;

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

  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return constantTimeEqual(expected, signature.toLowerCase());
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json("Method not allowed", 405);
  }

  const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  const paymongoKey = Deno.env.get("PAYMONGO_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !paymongoKey || !supabaseUrl || !serviceKey) {
    console.error("Missing webhook configuration");
    return json("Server configuration missing", 500);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("Paymongo-Signature") ?? "";

  if (!(await verifySignature(rawBody, signature, webhookSecret))) {
    return json("Invalid webhook signature", 401);
  }

  let event: any;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return json("Invalid JSON", 400);
  }

  const eventAttributes = event?.data?.attributes;
  if (eventAttributes?.type !== "checkout_session.payment.paid") {
    return json("Event ignored");
  }

  const checkoutId = eventAttributes?.data?.id;

  if (typeof checkoutId !== "string" || !checkoutId.startsWith("cs_")) {
    return json("Invalid checkout ID", 400);
  }

  const verification = await fetch(
    `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${paymongoKey}:`)}`,
      },
    },
  );

  if (!verification.ok) {
    console.error("PayMongo verification status:", verification.status);
    return json("PayMongo verification failed", 503);
  }

  const verified = await verification.json();
  const attributes = verified?.data?.attributes;

  if (verified?.data?.id !== checkoutId || attributes?.livemode !== false) {
    return json("Checkout verification mismatch", 409);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: batch, error: batchError } = await admin
    .from("booking_checkout_batches")
    .select("request_id")
    .eq("checkout_id", checkoutId)
    .maybeSingle();
  // An older deployment may not have installed multi-session booking yet.
  if (batchError && !["42P01", "PGRST205"].includes(batchError.code))
    return json("Batch lookup failed", 500);
  let payment: { gross_amount: number } | null = null;
  if (batch) {
    const { data: items, error: itemsError } = await admin
      .from("booking_checkout_batch_items")
      .select("booking_id")
      .eq("request_id", batch.request_id);
    if (itemsError || !items?.length)
      return json("Batch sessions lookup failed", 500);
    const { data: allocations, error } = await admin
      .from("payments")
      .select("gross_amount")
      .in(
        "paymongo_checkout_session_id",
        items.map((item) => `${checkoutId}:${item.booking_id}`),
      );
    if (error || allocations?.length !== items.length)
      return json("Batch payment lookup failed", 500);
    payment = {
      gross_amount: allocations.reduce(
        (sum, row) => sum + Number(row.gross_amount),
        0,
      ),
    };
  } else {
    const { data: singlePayment, error: lookupError } = await admin
      .from("payments")
      .select("gross_amount")
      .eq("paymongo_checkout_session_id", checkoutId)
      .maybeSingle();

    if (lookupError) return json("Payment lookup failed", 500);
    payment = singlePayment;
  }
  if (!payment) return json("Unknown checkout session", 404);

  const expectedAmount = Math.round(Number(payment.gross_amount) * 100);

  if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
    return json("Invalid booking amount", 409);
  }

  // Confirm the payment intent succeeded.
  if (attributes?.payment_intent?.attributes?.status !== "succeeded") {
    return json("Payment intent not succeeded", 409);
  }

  // Verify checkout line items match the booking amount.
  const items = attributes?.line_items;

  if (!Array.isArray(items) || items.length === 0) {
    return json("Missing checkout line items", 409);
  }

  let checkoutTotal = 0;

  for (const item of items) {
    if (
      item?.currency !== "PHP" ||
      !Number.isSafeInteger(item?.amount) ||
      !Number.isSafeInteger(item?.quantity) ||
      item.amount <= 0 ||
      item.quantity <= 0
    ) {
      return json("Invalid checkout line item", 409);
    }

    checkoutTotal += item.amount * item.quantity;
  }

  if (
    !Number.isSafeInteger(checkoutTotal) ||
    checkoutTotal !== expectedAmount
  ) {
    return json("Checkout amount mismatch", 409);
  }

  // Verify the actual GCash payment.
  const payments = attributes?.payments;

  if (!Array.isArray(payments)) {
    return json("Missing payment details", 409);
  }

  const paidPayment = payments.find((item: any) => {
    const details = item?.attributes;

    return (
      typeof item?.id === "string" &&
      item.id.startsWith("pay_") &&
      details?.status === "paid" &&
      details?.currency === "PHP" &&
      details?.livemode === false &&
      details?.source?.type === "gcash" &&
      Number(details?.amount) === expectedAmount
    );
  });

  if (!paidPayment) {
    return json("No verified GCash payment", 409);
  }

  // Finalize the booking using the restricted RPC.
  if (batch) {
    const { error } = await admin.rpc("finalize_booking_batch_payment", {
      p_checkout_id: checkoutId,
      p_payment_id: paidPayment.id,
    });
    if (error) return json("Batch payment finalization failed", 500);
    return json("All session payments verified and recorded");
  }
  const { error: finalizeError } = await admin.rpc(
    "finalize_campustutor_payment",
    { p_checkout_session_id: checkoutId },
  );

  if (finalizeError) {
    console.error("Payment finalization failed:", finalizeError.code);
    return json("Payment finalization failed", 500);
  }

  // Store the PayMongo payment ID.
  const { error: updateError } = await admin
    .from("payments")
    .update({ paymongo_payment_id: paidPayment.id })
    .eq("paymongo_checkout_session_id", checkoutId);

  if (updateError) {
    console.error("Payment ID update failed:", updateError.code);
    return json("Payment ID update failed", 500);
  }

  return json("Payment verified and recorded");
});
