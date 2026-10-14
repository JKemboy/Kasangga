// Never release a checkout's reservation until the provider confirms expiry.
export async function discardUnpaidCheckouts(
  admin: any,
  learnerId: string,
  secret: string,
  keepRequestId?: unknown,
) {
  const { data: batches, error } = await admin
    .from("booking_checkout_batches")
    .select("request_id,checkout_id,created_at")
    .eq("learner_id", learnerId)
    .is("paymongo_payment_id", null);
  if (error) throw new Error("Unable to check previous checkouts.");
  for (const batch of batches || []) {
    if (batch.request_id === keepRequestId) continue;
    const { data: items, error: itemsError } = await admin
      .from("booking_checkout_batch_items")
      .select("booking_id")
      .eq("request_id", batch.request_id);
    if (itemsError) throw new Error("Unable to check checkout reservations.");
    if (items?.length) {
      const { data: bookings, error: bookingError } = await admin
        .from("bookings")
        .select("payment_status,booking_status,amount")
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
        const attributes = checkout?.data?.attributes;
        const paid = attributes?.payments?.find(
          (entry: any) => (entry.attributes || entry).status === "paid",
        );
        // A paid checkout can stay active. Recover a delayed webhook rather
        // than treating it as an abandoned reservation forever.
        if (paid) {
          const { data: amounts, error: amountsError } = await admin
            .from("bookings")
            .select("amount")
            .in(
              "booking_id",
              (items || []).map((item: any) => item.booking_id),
            );
          const expected = Math.round(
            (amounts || []).reduce(
              (sum: number, row: any) => sum + Number(row.amount),
              0,
            ) * 100,
          );
          const details = paid.attributes || paid;
          const lines = attributes?.line_items;
          if (
            amountsError ||
            !expected ||
            checkout?.data?.id !== batch.checkout_id ||
            attributes?.livemode !== false ||
            attributes?.payment_intent?.attributes?.status !== "succeeded" ||
            !paid.id?.startsWith("pay_") ||
            details.currency !== "PHP" ||
            details.livemode !== false ||
            details.source?.type !== "gcash" ||
            details.amount !== expected ||
            !Array.isArray(lines) ||
            !lines.length ||
            lines.some(
              (line: any) =>
                line.currency !== "PHP" ||
                !Number.isSafeInteger(line.amount) ||
                line.amount <= 0 ||
                !Number.isSafeInteger(line.quantity) ||
                line.quantity <= 0,
            ) ||
            lines.reduce(
              (sum: number, line: any) => sum + line.amount * line.quantity,
              0,
            ) !== expected
          )
            throw new Error(
              "Previous payment needs verification. Please try again shortly.",
            );
          const { error: finalizeError } = await admin.rpc(
            "finalize_booking_batch_payment",
            {
              p_checkout_id: batch.checkout_id,
              p_payment_id: paid.id,
            },
          );
          if (finalizeError)
            throw new Error(
              "Unable to confirm previous payment. Please try again.",
            );
          continue;
        }
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
