// Each session remains a separate booking and payment allocation.
export async function createBatchPayment(
  admin: any,
  learnerId: string,
  payload: Record<string, unknown>,
  secret: string,
  appUrl: string,
  json: (body: Record<string, unknown>, status?: number) => Response,
) {
  const { data: reserved, error } = await admin.rpc("reserve_booking_batch", {
    p_learner_id: learnerId,
    p_service_id: payload.serviceId,
    p_topic: payload.topic,
    p_request_id: payload.idempotencyKey,
    p_sessions: payload.sessions,
    p_topic_id: payload.topicId ?? null,
  });
  if (error) return json({ error: error.message }, 409);
  if (reserved.checkoutUrl) return json(reserved);
  let checkout;
  try {
    const response = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${secret}:`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method_types: ["gcash"],
              line_items: reserved.sessions.map((session: any) => ({
                currency: "PHP",
                amount: Math.round(Number(session.amount) * 100),
                name: `${reserved.title} — ${session.date} ${session.time}`,
                quantity: 1,
              })),
              description: `Kasangga ${reserved.sessions.length} sessions`,
              success_url: `${appUrl}/?payment=success`,
              cancel_url: `${appUrl}/?payment=cancelled`,
            },
          },
        }),
      },
    );
    checkout = await response.json();
    if (
      !response.ok ||
      !checkout?.data?.id ||
      !checkout?.data?.attributes?.checkout_url
    )
      throw new Error("Unable to create payment checkout.");
  } catch {
    await admin.rpc("cancel_booking_batch", {
      p_request_id: payload.idempotencyKey,
      p_learner_id: learnerId,
    });
    return json(
      {
        error:
          "Unable to create checkout. No sessions were confirmed; please try again.",
      },
      502,
    );
  }
  const { error: attachError } = await admin.rpc(
    "attach_booking_batch_checkout",
    {
      p_request_id: payload.idempotencyKey,
      p_learner_id: learnerId,
      p_checkout_id: checkout.data.id,
      p_checkout_url: checkout.data.attributes.checkout_url,
    },
  );
  if (attachError)
    return json(
      {
        error:
          "Checkout could not be saved. Please check your bookings before retrying.",
      },
      500,
    );
  return json({
    checkoutUrl: checkout.data.attributes.checkout_url,
    checkoutSessionId: checkout.data.id,
    bookingIds: reserved.sessions.map((session: any) => session.bookingId),
    amount: reserved.amount,
  });
}
