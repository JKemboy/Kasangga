import { getSupabaseClient } from "./supabaseClient.js";
import { currentTutorProfile } from "./tutorServices.js";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const FIELDS =
  "slot_id,tutor_profile_id,service_id,day_of_week,start_time,end_time,is_active,availability_date,topic_id";

function databaseError(error, action) {
  if (["42P01", "PGRST205"].includes(error.code))
    return new Error(
      "The availability_slots table is unavailable. Check the Supabase schema.",
    );
  if (error.code === "42501" || error.code === "PGRST301")
    return new Error(
      `Database permission denied while ${action}. Apply the availability policies in supabase/manual/availability_slots_policies.sql.`,
    );
  return new Error(error.message || `Unable to ${action}. Please try again.`);
}

function decimalTime(value) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!match)
    throw new Error("The database returned an invalid availability time.");
  return Number(match[1]) + Number(match[2]) / 60;
}

function databaseTime(value) {
  const hour = Math.floor(value);
  const minute = Math.round((value - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function mapAvailability(row, services = []) {
  const day = DAYS.indexOf(String(row.day_of_week).toLowerCase());
  if (day < 0)
    throw new Error("The database returned an invalid availability weekday.");
  const date = new Date(Date.UTC(2000, 0, 3 + day)).toISOString().slice(0, 10);
  const serviceId = row.service_id == null ? null : String(row.service_id);
  const service = services.find((item) => item.id === serviceId);
  const topic = service?.topicDetails?.find(
    (item) => item.id === String(row.topic_id),
  );
  return {
    id: String(row.slot_id),
    serviceId,
    topicId: row.topic_id == null ? null : String(row.topic_id),
    serviceName: [service?.name, topic?.name].filter(Boolean).join(" · "),
    day,
    dayName: DAYS[day],
    date: row.availability_date || date,
    start: decimalTime(row.start_time),
    end: decimalTime(row.end_time),
    repeat: !row.availability_date,
    kind: "available",
    isActive: row.is_active,
  };
}

function validateAvailability(slot) {
  if (!Number.isInteger(slot.day) || slot.day < 0 || slot.day > 6)
    throw new Error("Choose a valid weekday.");
  if (
    !Number.isFinite(slot.start) ||
    !Number.isFinite(slot.end) ||
    slot.start < 7 ||
    slot.end > 21 ||
    slot.end <= slot.start ||
    slot.start * 2 !== Math.round(slot.start * 2) ||
    slot.end * 2 !== Math.round(slot.end * 2)
  )
    throw new Error("Choose valid times between 7:00 AM and 9:00 PM.");
  if (slot.serviceId != null && !/^\d+$/.test(String(slot.serviceId)))
    throw new Error("Choose a valid tutoring service.");
  if (slot.repeat === false && !/^\d{4}-\d{2}-\d{2}$/.test(slot.date || ""))
    throw new Error("Choose a valid availability date.");
}

export async function listTutorAvailability(
  client = getSupabaseClient(),
  services = [],
) {
  const tutor = await currentTutorProfile(client);
  const { data, error } = await client
    .from("availability_slots")
    .select(FIELDS)
    .eq("tutor_profile_id", tutor.tutor_profile_id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");
  if (error) throw databaseError(error, "loading tutor availability");
  return (data || []).map((row) => mapAvailability(row, services));
}

export async function saveTutorAvailability(
  slot,
  id = null,
  client = getSupabaseClient(),
  services = [],
) {
  validateAvailability(slot);
  const tutor = await currentTutorProfile(client);
  const serviceId =
    slot.serviceId == null || slot.serviceId === ""
      ? null
      : Number(slot.serviceId);
  if (serviceId !== null) {
    if (!Number.isSafeInteger(serviceId))
      throw new Error("Choose a valid tutoring service.");
    const { data: service, error: serviceError } = await client
      .from("services")
      .select("service_id")
      .eq("service_id", serviceId)
      .eq("tutor_profile_id", tutor.tutor_profile_id)
      .eq("service_status", "active")
      .maybeSingle();
    if (serviceError)
      throw databaseError(serviceError, "checking the selected service");
    if (!service)
      throw new Error("Choose one of your active tutoring services.");
  }

  const { data, error } = await client.rpc("save_tutor_availability", {
    p_slot: {
      id,
      serviceId,
      topicId: slot.topicId || null,
      date: slot.date,
      repeat: slot.repeat !== false,
      start: databaseTime(slot.start),
      end: databaseTime(slot.end),
    },
  });
  if (error) throw databaseError(error, "saving tutor availability");
  if (!data) throw new Error("The availability slot was not saved.");
  return mapAvailability(data, services);
}

export async function deactivateTutorAvailability(
  id,
  client = getSupabaseClient(),
) {
  const tutor = await currentTutorProfile(client);
  const { data, error } = await client
    .from("availability_slots")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("slot_id", id)
    .eq("tutor_profile_id", tutor.tutor_profile_id)
    .select("slot_id")
    .maybeSingle();
  if (error) throw databaseError(error, "removing tutor availability");
  if (!data)
    throw new Error(
      "The availability slot was not found or is already inactive.",
    );
}

export async function listBookableAvailability(
  tutorProfileId,
  serviceId,
  client = getSupabaseClient(),
) {
  if (!/^\d+$/.test(String(tutorProfileId)) || !/^\d+$/.test(String(serviceId)))
    throw new Error(
      "A valid tutor and service are required to load availability.",
    );
  const [availabilityResult, classResult, bookingResult] = await Promise.all([
    client
      .from("availability_slots")
      .select(FIELDS)
      .eq("tutor_profile_id", tutorProfileId)
      .eq("is_active", true)
      .or(`service_id.is.null,service_id.eq.${serviceId}`)
      .order("start_time"),
    client.rpc("get_tutor_class_blocks", {
      p_tutor_profile_id: String(tutorProfileId),
      p_service_id: String(serviceId),
    }),
    client.rpc("get_tutor_booking_blocks", {
      p_tutor_profile_id: String(tutorProfileId),
      p_service_id: String(serviceId),
    }),
  ]);
  if (availabilityResult.error)
    throw databaseError(
      availabilityResult.error,
      "loading available booking times",
    );
  if (classResult.error) {
    if (["42883", "PGRST202"].includes(classResult.error.code))
      throw new Error(
        "Class schedule blocking is not configured. Apply the class schedule policies in supabase/manual/availability_slots_policies.sql.",
      );
    throw databaseError(classResult.error, "checking tutor class times");
  }
  const classBlocks = (classResult.data || []).map((row) => ({
    dayName: String(row.day_of_week).toLowerCase(),
    start: row.start_time,
    end: row.end_time,
  }));
  if (bookingResult.error)
    throw new Error(
      "Could not check booked times. Apply supabase/manual/tutor_booking_blocks.sql and try again.",
    );
  return {
    slots: (availabilityResult.data || []).map((row) => mapAvailability(row)),
    classBlocks,
    bookingBlocks: (bookingResult.data || []).map((row) => ({
      date: row.session_date,
      start: row.start_time,
      end: row.end_time,
    })),
  };
}
