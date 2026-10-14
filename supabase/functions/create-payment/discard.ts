// Never release a checkout's reservation until the provider confirms expiry.
export async function discardUnpaidCheckouts(
  admin: any,
  learnerId: string,
  secret: string,
) {
  const { data: batches, error } = await admin
    .from("booking_checkout_batches")
    .select("request_id,checkout_id,created_at")
    .eq("learner_id", learnerId)
    .is("paymongo_payment_id", null);
  if (error) throw new Error("Unable to check previous checkouts.");
  for (const batch of batches || []) {
    const { data: items, error: itemsError } = await admin
      .from("booking_checkout_batch_items")
      .select("booking_id")
      .eq("request_id", batch.request_id);
    if (itemsError) throw new Error("Unable to check checkout reservations.");
    if (items?.length) {
      const { data: bookings, error: bookingError } = await admin
        .from("bookings")
        .select("payment_status,booking_status")
        .in(
          "booking_id",
          items.map((item: any) => item.booking_id),
        );
      if (bookingError) throw new Error("Unable to check checkout payments.");
      if (
        bookings.some(
          (booking: any) =>
            booking.payment_status !== "unpaid" ||
            !["pending", "cancelled"].includes(booking.booking_status),
        )
      )
        continue;
    }
    if (batch.checkout_id) {
      const endpoint = `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(batch.checkout_id)}`;
      const headers = { Authorization: `Basic ${btoa(`${secret}:`)}` };
      const expiry = await fetch(`${endpoint}/expire`, {
        method: "POST",
        headers,
      });
      if (!expiry.ok) {
        const verification = await fetch(endpoint, { headers });
        if (!verification.ok)
          throw new Error(
            "Unable to verify previous checkout. Please try again.",
          );
        const checkout = await verification.json();
        if (checkout?.data?.attributes?.status !== "expired")
          throw new Error(
            "Your previous payment may still be processing. Wait for its result before booking again.",
          );
      }
    } else if (Date.now() - new Date(batch.created_at).getTime() < 120000) {
      throw new Error(
        "Your previous checkout is still being created. Please try again shortly.",
      );
    }
    const { error: discardError } = await admin.rpc(
      "discard_unpaid_booking_batch",
      { p_request_id: batch.request_id, p_learner_id: learnerId },
    );
    if (discardError)
      throw new Error("Unable to remove unpaid checkout. Please try again.");
  }
}
