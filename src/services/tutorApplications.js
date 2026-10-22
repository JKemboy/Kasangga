import { getSupabaseClient } from "./supabaseClient.js";
import { applicationDocuments } from "../components/learner/application/applicationRules.js";

const statusLabels = {
  pending: "Pending",
  under_review: "Under Review",
  resubmission_required: "Resubmission Required",
  approved: "Approved",
  rejected: "Rejected",
};
const statusValues = Object.fromEntries(
  Object.entries(statusLabels).map(([value, label]) => [label, value]),
);

function applicationView(row, user, verificationDocuments = []) {
  const details = row.application_details || {};
  const documents = Object.fromEntries(
    verificationDocuments.map((document) => [
      document.document_type === "awards"
        ? "awards_" + document.document_id
        : document.document_type,
      {
        documentType: document.document_type,
        storagePath: document.file_path,
        name: document.file_name || document.file_path.split("/").at(-1),
        type: document.mime_type || "",
        state: document.review_status || "pending",
        error: document.review_notes || "",
      },
    ]),
  );
  const profile = user || {};
  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    details.name ||
    "";
  const account = {
    name,
    studentId: profile.student_id || details.studentId || "",
    email: profile.csu_email || details.email || "",
    college: profile.college || details.college || "",
    program: profile.program || details.program || "",
    year: profile.year_level
      ? String(profile.year_level)
      : details.year
        ? String(details.year)
        : "",
  };
  return {
    id: String(row.application_id),
    userId: row.user_id,
    name: account.name,
    studentId: account.studentId,
    email: account.email,
    college: account.college,
    program: account.program,
    year: account.year,
    status: statusLabels[row.application_status] || row.application_status,
    date: row.submitted_at?.slice(0, 10),
    created: row.submitted_at,
    updated: row.reviewed_at || row.submitted_at,
    reviewed_at: row.reviewed_at,
    notes: row.admin_notes || "",
    rejectionReason: row.rejection_reason || "",
    history: row.review_history || [],
    subjects: details.subjects || [],
    courseCode: details.courseCode || "",
    courseDescription: details.courseDescription || "",
    gcashName: details.gcashName || "",
    gcashNumber: details.gcashNumber || "",
    topics: details.topics || {},
    bio: details.bio || "",
    experience: details.experience || "",
    type: details.sessionType || "",
    motivation: details.motivation || "",
    documents,
    account,
  };
}

async function requireSessionUser(expectedUserId, client) {
  const { data, error } = await client.auth.getUser();
  if (error)
    throw new Error(`Could not verify your Supabase session: ${error.message}`);
  if (!data?.user)
    throw new Error("Sign in with Supabase to manage tutor applications.");
  if (expectedUserId && data.user.id !== expectedUserId)
    throw new Error("Your account changed. Sign in again and try once more.");
  return data.user;
}

async function loadDocuments(applicationIds, client) {
  if (!applicationIds.length) return [];
  const { data, error } = await client
    .from("verification_documents")
    .select("*")
    .in("application_id", applicationIds);
  if (error)
    throw new Error(
      `Could not load tutor application documents: ${error.message}`,
    );
  return data || [];
}

export async function loadMyTutorApplication(
  userId,
  client = getSupabaseClient(),
) {
  const user = await requireSessionUser(userId, client);
  const { data, error } = await client
    .from("tutor_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    throw new Error(`Could not load your tutor application: ${error.message}`);
  if (!data) return null;
  const docs = await loadDocuments([data.application_id], client);
  return applicationView(data, null, docs);
}

export async function submitTutorApplication(
  draft,
  account,
  userId,
  applicationId,
  client = getSupabaseClient(),
) {
  const user = await requireSessionUser(userId, client);
  const documents = applicationDocuments(draft.documents);
  const details = {
    applicationVersion: 2,
    name: account.name,
    studentId: account.studentId,
    email: account.email,
    college: account.college,
    program: account.program,
    year: account.year,
    subjects: draft.subjects,
    courseCode: draft.courseCode?.trim(),
    courseDescription: draft.courseDescription?.trim(),
    gcashName: draft.gcashName?.trim(),
    gcashNumber: draft.gcashNumber,
    bio: draft.bio,
    experience: draft.experience,
    motivation: draft.motivation,
    certified: draft.certified,
  };
  const { data, error } = await client.rpc("submit_tutor_application", {
    p_details: details,
    p_documents: documents,
    p_application_id: applicationId ? Number(applicationId) : null,
  });
  if (error)
    throw new Error(
      `Could not submit your tutor application: ${error.message}`,
    );
  if (!data)
    throw new Error("The server did not return a saved application number.");
  return { id: String(data), userId: user.id };
}

export async function loadTutorApplications(client = getSupabaseClient()) {
  const user = await requireSessionUser(null, client);
  const { data: roles, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .eq("is_active", true);
  if (roleError)
    throw new Error(`Could not verify admin access: ${roleError.message}`);
  if (!roles?.length)
    throw new Error(
      "Active admin account required to review tutor applications.",
    );

  const { data, error } = await client
    .from("tutor_applications")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error)
    throw new Error(`Could not load tutor applications: ${error.message}`);
  if (!data?.length) return [];

  const ids = data.map((application) => application.user_id);
  const { data: users, error: usersError } = await client
    .from("users")
    .select(
      "user_id,first_name,last_name,student_id,csu_email,college,program,year_level,account_status",
    )
    .in("user_id", ids);
  if (usersError)
    throw new Error(`Could not load applicant profiles: ${usersError.message}`);
  const docs = await loadDocuments(
    data.map((application) => application.application_id),
    client,
  );
  const userById = new Map(
    (users || []).map((profile) => [profile.user_id, profile]),
  );
  return data.map((application) =>
    applicationView(
      application,
      userById.get(application.user_id),
      docs.filter(
        (document) => document.application_id === application.application_id,
      ),
    ),
  );
}

export async function saveTutorApplicationReview(
  application,
  status = null,
  client = getSupabaseClient(),
) {
  const admin = await requireSessionUser(null, client);
  const { data: roles, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", admin.id)
    .eq("role", "admin")
    .eq("is_active", true);
  if (roleError)
    throw new Error(`Could not verify admin access: ${roleError.message}`);
  if (!roles?.length)
    throw new Error(
      "Active admin account required to review tutor applications.",
    );
  const nextStatus = statusValues[status] || null;
  const latestHistory = application.history?.at(-1) || {};
  const { error } = await client.rpc("review_tutor_application", {
    p_application_id: Number(application.id),
    p_status: nextStatus,
    p_notes: application.notes || "",
    p_reason: latestHistory.reason || "",
    p_requested_changes: latestHistory.requestedChanges || [],
  });
  if (error)
    throw new Error(`Could not save the application review: ${error.message}`);
}
