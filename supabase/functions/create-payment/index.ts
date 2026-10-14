import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createBatchPayment } from "./batch.ts";
import { discardUnpaidCheckouts } from "./discard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 2. Supabase configuration
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
  const appUrl = Deno.env.get("APP_URL");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !serviceRoleKey ||
    !paymongoSecretKey ||
    !appUrl
  ) {
    return jsonResponse({ error: "Server configuration is missing." }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 3. Authenticate student
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const token = authHeader.slice(7);

  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401);
  }

  const studentId = authData.user.id;

  // 4. Read booking request
  let payload: Record<string, unknown>;

  try {
    const parsed = await req.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "Booking details are required" }, 400);
    }

    payload = parsed;
  } catch {
    return jsonResponse({ error: "Invalid JSON request body" }, 400);
  }

  if (payload.action === "discardUnpaidCheckout") {
    try {
      await discardUnpaidCheckouts(adminSupabase, studentId, paymongoSecretKey);
      return jsonResponse({ discarded: true });
    } catch (error) {
      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to clear previous checkout.",
        },
        409,
      );
    }
  }
  if (Array.isArray(payload.sessions)) {
    try {
      await discardUnpaidCheckouts(
        adminSupabase,
        studentId,
        paymongoSecretKey,
        payload.idempotencyKey,
      );
    } catch (error) {
      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to clear previous checkout.",
        },
        409,
      );
    }
    return createBatchPayment(
      adminSupabase,
      studentId,
      payload,
      paymongoSecretKey,
      appUrl,
      jsonResponse,
    );
  }

  const { serviceId, topic, date, time, duration, type, idempotencyKey } =
    payload;

  // 5. Validate booking fields
  const serviceIdNumber = Number(serviceId);
  const durationNumber = Number(duration);

  const validDate =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

  const validTime =
    typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  const validBooking =
    Number.isSafeInteger(serviceIdNumber) &&
    serviceIdNumber > 0 &&
    typeof topic === "string" &&
    topic.trim().length > 0 &&
    topic.trim().length <= 200 &&
    validDate &&
    validTime &&
    [1, 1.5, 2].includes(durationNumber) &&
    ["Online", "In-person"].includes(type) &&
    typeof idempotencyKey === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey,
    );

  if (!validBooking) {
    return jsonResponse(
      {
        error: "Invalid booking details. Please review your selections.",
      },
      400,
    );
  }

  // 6. Check duplicate request before creating a booking
  const { data: existingBooking, error: existingError } = await adminSupabase
    .from("bookings")
    .select("booking_id")
    .eq("learner_id", studentId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: "Unable to verify booking request." }, 500);
  }

  if (existingBooking) {
    return jsonResponse(
      {
        error:
          "This booking request already exists. Please check your bookings before trying again.",
        bookingId: existingBooking.booking_id,
      },
      409,
    );
  }

  // 7. Verify service and retrieve database price
  const { data: service, error: serviceError } = await adminSupabase
    .from("services")
    .select(
      "service_id,tutor_profile_id,title,rate_per_hour,service_status,session_type",
    )
    .eq("service_id", serviceIdNumber)
    .eq("service_status", "active")
    .maybeSingle();

  if (serviceError) {
    return jsonResponse(
      { error: "Unable to verify the selected service." },
      500,
    );
  }

  if (!service) {
    return jsonResponse(
      {
        error: "The selected tutoring service is no longer available.",
      },
      404,
    );
  }

  // 8. Validate session type
  const normalizeSessionType = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  const selectedType = normalizeSessionType(String(type));

  const serviceType = normalizeSessionType(String(service.session_type ?? ""));

  const allowsSelectedType =
    serviceType === selectedType ||
    ["both", "hybrid", "onlineandinperson"].includes(serviceType);

  if (!allowsSelectedType) {
    return jsonResponse(
      {
        error: "The selected session type is not available for this service.",
      },
      400,
    );
  }

  // 9. Validate date and time using Philippine Time
  const bookingStart = new Date(`${date}T${time}:00+08:00`);

  if (
    Number.isNaN(bookingStart.getTime()) ||
    bookingStart.getTime() <= Date.now()
  ) {
    return jsonResponse(
      {
        error: "Please select a future booking date and time.",
      },
      400,
    );
  }

  const [startHour, startMinute] = String(time).split(":").map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = startMinutes + durationNumber * 60;

  if (startMinutes < 7 * 60 || endMinutes > 21 * 60) {
    return jsonResponse(
      {
        error: "Sessions must be scheduled between 7:00 AM and 9:00 PM.",
      },
      400,
    );
  }

  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;

  const bookingStartTime = `${time}:00`;

  const bookingEndTime =
    `${String(endHour).padStart(2, "0")}:` +
    `${String(endMinute).padStart(2, "0")}:00`;

  // 10. Find all services belonging to the tutor
  const { data: tutorServices, error: tutorServicesError } = await adminSupabase
    .from("services")
    .select("service_id")
    .eq("tutor_profile_id", service.tutor_profile_id);

  if (tutorServicesError) {
    return jsonResponse({ error: "Unable to check tutor availability." }, 500);
  }

  const tutorServiceIds = (tutorServices ?? []).map((item) => item.service_id);

  if (tutorServiceIds.length === 0) {
    return jsonResponse({ error: "No services found for this tutor." }, 404);
  }

  // 11. Check overlapping bookings
  const { data: conflictingBookings, error: conflictError } =
    await adminSupabase
      .from("bookings")
      .select("booking_id")
      .in("service_id", tutorServiceIds)
      .eq("session_date", date)
      .lt("start_time", bookingEndTime)
      .gt("end_time", bookingStartTime)
      .in("booking_status", ["pending", "confirmed"])
      .limit(1);

  if (conflictError) {
    return jsonResponse({ error: "Unable to check booking conflicts." }, 500);
  }

  if (conflictingBookings?.length) {
    return jsonResponse(
      {
        error: "This tutor already has a booking at the selected time.",
      },
      409,
    );
  }

  // 12. Calculate amount from database rate
  const hourlyRate = Number(service.rate_per_hour);

  const bookingAmount = Math.round(hourlyRate * durationNumber * 100) / 100;

  if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
    return jsonResponse({ error: "Invalid service price." }, 400);
  }

  // 13. Prepare pending booking
  const pendingBooking = {
    learner_id: studentId,
    service_id: serviceIdNumber,
    specific_topic: String(topic).trim(),
    session_date: date,
    start_time: bookingStartTime,
    end_time: bookingEndTime,
    duration: durationNumber,
    session_type: type,
    amount: bookingAmount,
    booking_status: "pending",
    payment_status: "unpaid",
    idempotency_key: idempotencyKey,
  };

  // 14. Save pending booking to database
  const { data: savedBooking, error: bookingError } = await adminSupabase
    .from("bookings")
    .insert(pendingBooking)
    .select("booking_id")
    .single();

  if (bookingError || !savedBooking) {
    return jsonResponse(
      {
        error:
          "Unable to create pending booking. Please check your bookings before retrying.",
      },
      500,
    );
  }

  // 15. Temporary response
  // PayMongo checkout will be added in the next step.
  // 15. Create PayMongo GCash checkout session
  const amountInCentavos = Math.round(bookingAmount * 100);

  const checkoutResponse = await fetch(
    "https://api.paymongo.com/v1/checkout_sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${paymongoSecretKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method_types: ["gcash"],
            line_items: [
              {
                currency: "PHP",
                amount: amountInCentavos,
                name: String(service.title),
                quantity: 1,
              },
            ],
            description: `CampusTutor Booking #${savedBooking.booking_id}`,
            success_url: `${appUrl}/?payment=success`,
            cancel_url: `${appUrl}/?payment=cancelled`,
          },
        },
      }),
    },
  );

  const checkoutResult = await checkoutResponse.json();

  if (!checkoutResponse.ok) {
    return jsonResponse(
      {
        error: "Unable to create PayMongo checkout session.",
        bookingId: savedBooking.booking_id,
      },
      502,
    );
  }

  const checkoutUrl = checkoutResult?.data?.attributes?.checkout_url;

  const checkoutSessionId = checkoutResult?.data?.id;

  if (!checkoutUrl || !checkoutSessionId) {
    return jsonResponse(
      {
        error: "PayMongo did not return a valid checkout session.",
        bookingId: savedBooking.booking_id,
      },
      502,
    );
  }

  // 16. Save the PayMongo checkout session
  // before returning the checkout URL.
  const { error: paymentError } = await adminSupabase.from("payments").insert({
    booking_id: savedBooking.booking_id,
    transaction_reference: `CT-${savedBooking.booking_id}`,
    paymongo_checkout_session_id: checkoutSessionId,
    payment_method: "gcash",
    gross_amount: bookingAmount,
    payment_status: "pending",
  });

  if (paymentError) {
    console.error(
      "Failed to save payment record:",
      paymentError.code,
      paymentError.message,
    );

    return jsonResponse(
      {
        error: "Checkout created but payment record could not be saved.",
        bookingId: savedBooking.booking_id,
      },
      500,
    );
  }

  // 17. Return checkout details to the frontend
  return jsonResponse({
    checkoutUrl,
    checkoutSessionId,
    bookingId: savedBooking.booking_id,
    amount: bookingAmount,
    bookingStatus: "pending",
    paymentStatus: "unpaid",
  });
});
