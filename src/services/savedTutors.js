import { getSupabaseClient } from "./supabaseClient.js";
import { listDiscoverableTutors } from "./tutorServices.js";

export const serviceKey = (record) =>
  record?.serviceId == null ? null : String(record.serviceId);
export function savedService(tutor, service) {
  return {
    ...tutor,
    serviceId: String(service.id),
    serviceName: service.name,
    selectedService: service.name,
    subjects: service.subtitle,
    rate: service.rate,
    price: "\u20b1" + service.rate.toLocaleString(),
    types: service.type === "Both" ? ["Online", "In-person"] : [service.type],
  };
}
function fail(error) {
  if (!error) return;
  if (["42P01", "PGRST205"].includes(error.code))
    throw new Error(
      "Saved Tutors database setup is missing. Run supabase/manual/saved_services.sql in Supabase SQL Editor.",
    );
  throw new Error(
    error.message || "Could not update Saved Tutors. Please try again.",
  );
}
async function userId(client) {
  const { data, error } = await client.auth.getUser();
  fail(error);
  if (!data?.user) throw new Error("Sign in to manage Saved Tutors.");
  return data.user.id;
}
export async function listSavedTutors(client = getSupabaseClient()) {
  const id = await userId(client);
  const { data, error } = await client
    .from("saved_services")
    .select("service_id,saved_at")
    .eq("learner_id", id)
    .order("saved_at", { ascending: false });
  fail(error);
  if (!data?.length) return [];
  const directory = await listDiscoverableTutors(client);
  const byId = new Map(
    directory.flatMap((t) =>
      t.services.map((s) => [String(s.id), savedService(t, s)]),
    ),
  );
  return data.map((row) => ({
    ...(byId.get(String(row.service_id)) || {
      serviceId: String(row.service_id),
      serviceName: "Unavailable service",
      name: "Unavailable tutor",
      unavailable: true,
      services: [],
    }),
    savedAt: row.saved_at,
  }));
}
export async function persistSavedTutor(
  tutor,
  saved,
  client = getSupabaseClient(),
) {
  const key = serviceKey(tutor);
  if (!key || !/^\d+$/.test(key))
    throw new Error(
      "Open this tutor from Find a Tutor to save their current database profile.",
    );
  const id = await userId(client);
  const result = saved
    ? await client
        .from("saved_services")
        .upsert(
          { learner_id: id, service_id: key },
          { onConflict: "learner_id,service_id", ignoreDuplicates: true },
        )
    : await client
        .from("saved_services")
        .delete()
        .eq("learner_id", id)
        .eq("service_id", key);
  fail(result.error);
}
