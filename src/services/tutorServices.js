import { getSupabaseClient } from "./supabaseClient.js";

const SERVICE_FIELDS =
  "service_id,tutor_profile_id,title,subject,category,level,description,session_type,rate_per_hour,service_status,service_topics(topic_id,topic_name,rate_per_hour,session_type,meeting_link,location,is_active)";

function databaseError(error, action) {
  if (error.code === "42501" || error.code === "PGRST301")
    return new Error(
      `Database permission denied while ${action}. Check the Supabase RLS policies for services, service_topics, tutor_profiles, users, and user_roles.`,
    );
  return new Error(error.message || `Unable to ${action}. Please try again.`);
}

function mapService(row) {
  const topics =
    row.topics ||
    (row.service_topics || [])
      .filter((topic) => topic.is_active !== false)
      .sort((a, b) => (a.topic_id || 0) - (b.topic_id || 0))
      .map((topic) => topic.topic_name);
  return {
    id: String(row.service_id),
    tutorProfileId: String(row.tutor_profile_id),
    name: row.title,
    subtitle: row.subject,
    category: row.category || "Other",
    level: row.level || "All Levels",
    description: row.description || "",
    topics: topics.join(", "),
    topicDetails: (row.service_topics || [])
      .filter((topic) => topic.is_active !== false)
      .map((topic) => ({
        id: String(topic.topic_id),
        name: topic.topic_name,
        rate: Number(topic.rate_per_hour ?? row.rate_per_hour),
        types:
          (topic.session_type || row.session_type)?.toLowerCase() === "both"
            ? ["Online", "In-person"]
            : [
                (topic.session_type || row.session_type)?.toLowerCase() ===
                "online"
                  ? "Online"
                  : "In-person",
              ],
        meetingLink: topic.meeting_link || "",
        location: topic.location || "",
      })),
    rate: Number(row.rate_per_hour),
    type:
      { online: "Online", "in-person": "In-person", both: "Both" }[
        row.session_type?.toLowerCase()
      ] || row.session_type,
    status:
      { active: "Active", inactive: "Inactive", suspended: "Suspended" }[
        row.service_status?.toLowerCase()
      ] || row.service_status,
    rating: null,
    completed: null,
  };
}

export async function loadServiceTopicSettings(
  serviceIds,
  client = getSupabaseClient(),
) {
  const { data, error } = await client.rpc("get_service_topic_settings", {
    p_service_ids: serviceIds,
  });
  if (error) throw databaseError(error, "loading topic settings");
  return data || [];
}

export function withTopicSettings(service, rows) {
  const topics = rows.filter(
    (topic) => String(topic.service_id) === String(service.id),
  );
  return {
    ...service,
    topics: topics.map((topic) => topic.topic_name),
    topicDetails: topics.map((topic) => ({
      id: String(topic.topic_id),
      name: topic.topic_name,
      rate: Number(topic.rate_per_hour ?? service.rate),
      types:
        (topic.session_type || service.type)?.toLowerCase() === "both"
          ? ["Online", "In-person"]
          : [
              (topic.session_type || service.type)?.toLowerCase() === "online"
                ? "Online"
                : "In-person",
            ],
      meetingLink: topic.meeting_link || "",
      location: topic.location || "",
    })),
  };
}

export async function currentTutorProfile(client) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError)
    throw new Error(
      `Could not verify your Supabase session: ${authError.message}`,
    );
  const user = authData?.user;
  if (!user) throw new Error("Sign in with Supabase to manage tutor services.");

  const { data: profile, error: profileError } = await client
    .from("users")
    .select("user_id,account_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError)
    throw databaseError(profileError, "checking the tutor account");
  if (!profile || profile.account_status?.toLowerCase() !== "active")
    throw new Error("An active account is required to manage tutor services.");

  const { data: roles, error: roleError } = await client
    .from("user_roles")
    .select("user_role_id")
    .eq("user_id", user.id)
    .ilike("role", "tutor")
    .eq("is_active", true)
    .limit(1);
  if (roleError) throw databaseError(roleError, "checking the tutor role");
  if (!roles?.length)
    throw new Error("An active tutor role is required to manage services.");

  const { data: tutorProfile, error: tutorProfileError } = await client
    .from("tutor_profiles")
    .select("tutor_profile_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (tutorProfileError)
    throw databaseError(tutorProfileError, "loading the tutor profile");
  if (!tutorProfile)
    throw new Error(
      "Your account does not have a tutor profile. Ask an administrator to complete tutor approval.",
    );
  return tutorProfile;
}

function serviceValues(values, tutorProfileId) {
  return {
    tutor_profile_id: tutorProfileId,
    title: values.name,
    subject: values.subtitle,
    category: values.category,
    level: values.level,
    description: values.description,
    session_type: values.type.toLowerCase(),
    rate_per_hour: Number(values.rate),
  };
}

function topicRows(serviceId, topics) {
  return [
    ...new Set(
      String(topics)
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
    ),
  ].map((topic_name) => ({ service_id: serviceId, topic_name }));
}

async function restoreTopics(client, serviceId, oldTopics) {
  const { error: deleteError } = await client
    .from("service_topics")
    .delete()
    .eq("service_id", serviceId);
  if (deleteError) return deleteError;
  if (!oldTopics.length) return null;
  const { error } = await client.from("service_topics").insert(
    oldTopics.map((topic) => ({
      service_id: serviceId,
      topic_name: topic.topic_name,
    })),
  );
  return error;
}

async function replaceTopics(client, serviceId, topics, oldTopics = []) {
  const { error: deleteError } = await client
    .from("service_topics")
    .delete()
    .eq("service_id", serviceId);
  if (deleteError) throw databaseError(deleteError, "updating service topics");

  const rows = topicRows(serviceId, topics);
  if (!rows.length) return;
  const { error } = await client.from("service_topics").insert(rows);
  if (!error) return;

  const restoreError = await restoreTopics(client, serviceId, oldTopics);
  const saveError = databaseError(error, "saving service topics");
  if (restoreError)
    throw new Error(
      `${saveError.message} Existing topics could not be restored: ${restoreError.message}`,
    );
  throw saveError;
}

async function loadService(client, serviceId, tutorProfileId) {
  const { data, error } = await client
    .from("services")
    .select(SERVICE_FIELDS)
    .eq("service_id", serviceId)
    .eq("tutor_profile_id", tutorProfileId)
    .maybeSingle();
  if (error) throw databaseError(error, "loading the saved service");
  if (!data) throw new Error("The database did not return the saved service.");
  return mapService(data);
}

export async function listTutorServices(client = getSupabaseClient()) {
  const tutor = await currentTutorProfile(client);
  const { data, error } = await client
    .from("services")
    .select(SERVICE_FIELDS)
    .eq("tutor_profile_id", tutor.tutor_profile_id)
    .order("created_at", { ascending: false });
  if (error) throw databaseError(error, "loading tutor services");
  return (data || []).map(mapService);
}

export async function saveTutorService(
  values,
  id = null,
  client = getSupabaseClient(),
) {
  const tutor = await currentTutorProfile(client);
  let serviceId;

  if (Array.isArray(values.topicDetails)) {
    const { data, error } = await client.rpc("save_tutor_topic_service", {
      p_service_id: id == null ? null : Number(id),
      p_title: values.name,
      p_description: values.description,
      p_topics: values.topicDetails.map((topic) => ({
        id: topic.id || null,
        name: topic.name.trim(),
        rate: Number(topic.rate),
        type: topic.types.length === 2 ? "both" : topic.types[0]?.toLowerCase(),
        meetingLink: topic.types.includes("Online")
          ? topic.meetingLink.trim()
          : null,
        location: topic.types.includes("In-person")
          ? topic.location.trim()
          : null,
        availability: topic.availability.map((slot) => ({
          date: slot.date,
          repeat: slot.repeat,
          start: `${String(Math.floor(slot.start)).padStart(2, "0")}:${String(Math.round((slot.start % 1) * 60)).padStart(2, "0")}:00`,
          end: `${String(Math.floor(slot.end)).padStart(2, "0")}:${String(Math.round((slot.end % 1) * 60)).padStart(2, "0")}:00`,
        })),
      })),
    });
    if (error) throw databaseError(error, "saving topics and their schedules");
    return loadService(client, data, tutor.tutor_profile_id);
  }

  if (Array.isArray(values.availability) && values.availability.length) {
    const { data, error } = await client.rpc(
      "save_tutor_service_with_availability",
      {
        p_service_id: id == null ? null : Number(id),
        p_values: {
          ...serviceValues(values, tutor.tutor_profile_id),
          topics: values.topics,
        },
        p_slots: values.availability.map((slot) => ({
          date: slot.date,
          repeat: slot.repeat,
          start: `${String(Math.floor(slot.start)).padStart(2, "0")}:${String(Math.round((slot.start % 1) * 60)).padStart(2, "0")}:00`,
          end: `${String(Math.floor(slot.end)).padStart(2, "0")}:${String(Math.round((slot.end % 1) * 60)).padStart(2, "0")}:00`,
        })),
      },
    );
    if (error)
      throw databaseError(error, "saving the service and availability");
    return loadService(client, data, tutor.tutor_profile_id);
  }

  if (id === null || id === undefined) {
    const { data, error } = await client
      .from("services")
      .insert({
        ...serviceValues(values, tutor.tutor_profile_id),
        service_status: "active",
      })
      .select("service_id")
      .single();
    if (error) throw databaseError(error, "creating the service");
    serviceId = data.service_id;
    try {
      await replaceTopics(client, serviceId, values.topics);
    } catch (topicError) {
      const { error: rollbackError } = await client
        .from("services")
        .delete()
        .eq("service_id", serviceId)
        .eq("tutor_profile_id", tutor.tutor_profile_id);
      if (rollbackError)
        throw new Error(
          `${topicError.message} The incomplete service could not be removed: ${rollbackError.message}`,
        );
      throw topicError;
    }
  } else {
    const { data: existing, error: existingError } = await client
      .from("services")
      .select("service_id,service_status,service_topics(topic_name)")
      .eq("service_id", id)
      .eq("tutor_profile_id", tutor.tutor_profile_id)
      .maybeSingle();
    if (existingError)
      throw databaseError(existingError, "checking the service before editing");
    if (!existing || existing.service_status?.toLowerCase() === "suspended")
      throw new Error(
        "This service could not be found, is suspended, or does not belong to your account.",
      );
    serviceId = existing.service_id;
    const oldTopics = existing.service_topics || [];
    await replaceTopics(client, serviceId, values.topics, oldTopics);

    const { data, error } = await client
      .from("services")
      .update({
        ...serviceValues(values, tutor.tutor_profile_id),
        updated_at: new Date().toISOString(),
      })
      .eq("service_id", serviceId)
      .eq("tutor_profile_id", tutor.tutor_profile_id)
      .not("service_status", "ilike", "suspended")
      .select("service_id")
      .maybeSingle();
    if (error || !data) {
      const restoreError = await restoreTopics(client, serviceId, oldTopics);
      const updateError = error
        ? databaseError(error, "updating the service")
        : new Error(
            "This service could not be found, is suspended, or does not belong to your account.",
          );
      if (restoreError)
        throw new Error(
          `${updateError.message} Existing topics could not be restored: ${restoreError.message}`,
        );
      throw updateError;
    }
  }

  return loadService(client, serviceId, tutor.tutor_profile_id);
}

export async function setTutorServiceStatus(
  id,
  status,
  client = getSupabaseClient(),
) {
  const nextStatus = status?.toLowerCase();
  if (!["active", "inactive"].includes(nextStatus))
    throw new Error("A tutor may only activate or deactivate a service.");
  const tutor = await currentTutorProfile(client);
  const { data, error } = await client
    .from("services")
    .update({
      service_status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("service_id", id)
    .eq("tutor_profile_id", tutor.tutor_profile_id)
    .not("service_status", "ilike", "suspended")
    .select("service_id")
    .maybeSingle();
  if (error) throw databaseError(error, "changing service status");
  if (!data)
    throw new Error(
      "This service could not be found, is suspended, or does not belong to your account.",
    );
  return loadService(client, data.service_id, tutor.tutor_profile_id);
}

export function mapDirectory(rows) {
  const tutors = new Map();
  for (const row of rows) {
    const key = String(row.tutor_profile_id);
    if (!tutors.has(key)) {
      const name = row.name?.trim() || "Tutor";
      tutors.set(key, {
        id: key,
        tutorProfileId: key,
        userId: row.user_id,
        avatarUserId: row.user_id,
        name,
        degree: row.program || "",
        bio: row.bio || "",
        rating: Number(row.average_rating),
        completed: row.total_sessions,
        initials: name
          .split(/\s+/)
          .map((v) => v[0])
          .slice(0, 2)
          .join(""),
        verified: true,
        online: null,
        services: [],
        reviews: null,
      });
    }
    const service = mapService(row);
    tutors.get(key).services.push({
      ...service,
      topics:
        row.topics ||
        (row.service_topics || [])
          .map((topic) => topic.topic_name)
          .filter(Boolean),
    });
  }
  return [...tutors.values()].map((tutor) => ({
    ...tutor,
    levels: [...new Set(tutor.services.map((service) => service.level))],
    subjects: [...new Set(tutor.services.map((service) => service.subtitle))]
      .filter(Boolean)
      .join(", "),
    expertise: [
      ...new Set(tutor.services.flatMap((service) => service.topics)),
    ],
    rate: Math.min(...tutor.services.map((service) => service.rate)),
    price: `₱${Math.min(...tutor.services.map((service) => service.rate)).toLocaleString()}`,
    types: [
      ...new Set(
        tutor.services.flatMap((service) =>
          service.type === "Both" ? ["Online", "In-person"] : [service.type],
        ),
      ),
    ],
  }));
}

export async function listDiscoverableTutors(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("find_tutor_services");
  if (error) {
    if (error.code === "PGRST202")
      throw new Error(
        "Tutor directory database function is missing. Run supabase/manual/find_tutor_services.sql in Supabase SQL Editor.",
      );
    throw databaseError(error, "loading recommended tutors");
  }
  if (!data?.length) return [];
  const settings = await loadServiceTopicSettings(
    data.map((row) => row.service_id),
    client,
  );
  const tutors = mapDirectory(
    data.map((row) => ({
      ...row,
      service_topics: settings.filter(
        (topic) => String(topic.service_id) === String(row.service_id),
      ),
      topics: undefined,
    })),
  );
  return tutors;
}
