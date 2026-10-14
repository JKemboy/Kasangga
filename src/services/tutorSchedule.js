import { getSupabaseClient } from "./supabaseClient.js";
import { currentTutorProfile } from "./tutorServices.js";
import { ownsSchedulePath, SCHEDULE_BUCKET } from "./scheduleStorage.js";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const SCHEDULE_FIELDS =
  "class_schedule_id,source_file,uploaded_at,updated_at,class_schedule_entries(course_code,course_name,day_of_week,start_time,end_time,room,is_confirmed)";

function databaseError(error, action) {
  if (["42P01", "PGRST205"].includes(error.code))
    return new Error(
      "The class schedule tables are unavailable. Check the Supabase schema.",
    );
  if (error.code === "42501" || error.code === "PGRST301")
    return new Error(
      `Database permission denied while ${action}. Apply the class schedule policies in supabase/manual/availability_slots_policies.sql.`,
    );
  return new Error(error.message || `Unable to ${action}. Please try again.`);
}

function dayNumber(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (/^[0-6]$/.test(normalized)) return Number(normalized);
  const index = DAYS.findIndex(
    (day) => day === normalized || day.slice(0, 3) === normalized,
  );
  if (index < 0)
    throw new Error("The database returned an invalid class weekday.");
  return index;
}

function decimalTime(value) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59)
    throw new Error("The database returned an invalid class time.");
  return Number(match[1]) + Number(match[2]) / 60;
}

function mapSchedule(row) {
  const classes = (row.class_schedule_entries || [])
    .filter((entry) => entry.is_confirmed)
    .map((entry) => [
      dayNumber(entry.day_of_week),
      decimalTime(entry.start_time),
      decimalTime(entry.end_time),
      entry.course_code,
      entry.course_name,
      entry.room,
    ])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return {
    id: String(row.class_schedule_id),
    source: row.source_file || "",
    confirmedAt: row.updated_at || row.uploaded_at,
    classes,
  };
}

export async function listTutorClassSchedule(client = getSupabaseClient()) {
  await currentTutorProfile(client);
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError)
    throw new Error(
      `Could not verify your Supabase session: ${authError.message}`,
    );
  const user = authData?.user;
  if (!user)
    throw new Error("Sign in with Supabase to load your class schedule.");

  const { data, error } = await client
    .from("class_schedules")
    .select(SCHEDULE_FIELDS)
    .eq("user_id", user.id)
    .eq("review_status", "confirmed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw databaseError(error, "loading the confirmed class schedule");
  return data ? mapSchedule(data) : null;
}

async function removePartialSchedule(client, scheduleId, originalError) {
  const { error: entriesError } = await client
    .from("class_schedule_entries")
    .delete()
    .eq("class_schedule_id", scheduleId);
  const { error: scheduleError } = await client
    .from("class_schedules")
    .delete()
    .eq("class_schedule_id", scheduleId);
  const cleanupErrors = [entriesError, scheduleError].filter(Boolean);
  if (cleanupErrors.length)
    throw new Error(
      `${originalError.message || "Saving the class schedule failed."} Cleanup also failed: ${cleanupErrors.map((item) => item.message).join("; ")}`,
    );
  throw databaseError(originalError, "saving the confirmed class schedule");
}

export async function saveTutorClassSchedule(
  draft,
  client = getSupabaseClient(),
) {
  await currentTutorProfile(client);
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError)
    throw new Error(
      `Could not verify your Supabase session: ${authError.message}`,
    );
  const user = authData?.user;
  if (!user)
    throw new Error("Sign in with Supabase to save your class schedule.");
  if (!ownsSchedulePath(draft?.storagePath, user.id))
    throw new Error(
      "Upload your original schedule to private storage before confirming.",
    );
  const { error: sourceError } = await client.storage
    .from(SCHEDULE_BUCKET)
    .info(draft.storagePath);
  if (sourceError)
    throw new Error(
      `Could not verify your uploaded schedule: ${sourceError.message}`,
    );
  if (!Array.isArray(draft?.rows) || draft.rows.length === 0)
    throw new Error("Add at least one class before confirming your schedule.");

  const preparedEntries = draft.rows.map((row) => {
    if (!row || typeof row !== "object")
      throw new Error("Fix every class row before confirming your schedule.");
    const day = Number(row?.day);
    const code = typeof row.code === "string" ? row.code.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const room = typeof row.room === "string" ? row.room.trim() : "";
    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6 ||
      typeof row.start !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.start || "") ||
      typeof row.end !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.end || "") ||
      row.end <= row.start ||
      !code ||
      !name ||
      !room
    )
      throw new Error("Fix every class row before confirming your schedule.");
    return {
      course_code: code,
      course_name: name,
      day_of_week: DAYS[day],
      start_time: `${row.start}:00`,
      end_time: `${row.end}:00`,
      room,
      is_confirmed: true,
    };
  });
  const scheduleValues = {
    user_id: user.id,
    source_file: draft.storagePath,
    ocr_confidence: Number.isFinite(draft.confidence) ? draft.confidence : 0,
    review_status: "pending",
    updated_at: new Date().toISOString(),
  };
  const { data: schedule, error: scheduleError } = await client
    .from("class_schedules")
    .insert(scheduleValues)
    .select("class_schedule_id")
    .single();
  if (scheduleError)
    throw databaseError(scheduleError, "creating the class schedule");

  const scheduleId = schedule.class_schedule_id;
  const entries = preparedEntries.map((entry) => ({
    ...entry,
    class_schedule_id: scheduleId,
  }));
  const { error: entriesError } = await client
    .from("class_schedule_entries")
    .insert(entries);
  if (entriesError)
    return removePartialSchedule(client, scheduleId, entriesError);

  const confirmedAt = new Date().toISOString();
  const { data: confirmed, error: confirmError } = await client
    .from("class_schedules")
    .update({ review_status: "confirmed", updated_at: confirmedAt })
    .eq("class_schedule_id", scheduleId)
    .eq("user_id", user.id)
    .select("class_schedule_id")
    .maybeSingle();
  if (confirmError)
    return removePartialSchedule(client, scheduleId, confirmError);
  if (!confirmed)
    return removePartialSchedule(
      client,
      scheduleId,
      new Error("The schedule was inserted but could not be confirmed."),
    );

  return mapSchedule({
    class_schedule_id: scheduleId,
    source_file: scheduleValues.source_file,
    updated_at: confirmedAt,
    class_schedule_entries: entries,
  });
}
