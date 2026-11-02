import { normalizeRoles } from "./accountRoles.js";
// Account service: resolves the authenticated user's public profile and active portal roles before dashboards load.
import { findCollege, findProgram } from "./collegeProgramMap.js";
export const isCsuEmail = (email) =>
  /^[^\s@]+@carsu\.edu\.ph$/i.test(String(email || "").trim());
export async function loadAuthAccount(client, userId) {
  const [profile, roles] = await Promise.all([
    client.from("users").select("*").eq("user_id", userId).maybeSingle(),
    client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);
  if (profile.error || roles.error)
    throw new Error(
      "Unable to load account permissions. Check the users/user_roles read policies or try again.",
    );
  if (!profile.data)
    throw new Error(
      "Your Auth account exists, but its public.users profile is missing. Ask an LCO to provision your profile.",
    );
  if (profile.data.account_status !== "active")
    throw new Error("Your account is not active. Contact an LCO.");
  const allowed = normalizeRoles((roles.data || []).map((r) => r.role)).filter(
    (r) => ["learner", "tutor", "lco", "oswe"].includes(r),
  );
  if (!allowed.length)
    throw new Error(
      "No active portal role is assigned. Ask an LCO to provision your account.",
    );
  return { profile: profile.data, roles: allowed };
}
export function privilegedAccountRole(roles) {
  return (
    ["lco", "oswe"].find((role) => normalizeRoles(roles).includes(role)) || null
  );
}
export function accountHome(roles) {
  const role =
    privilegedAccountRole(roles) ||
    ["learner", "tutor"].find((value) => roles.includes(value));
  return role ? `/${role}-dashboard` : "/login";
}
export function privilegedAccountHome(roles) {
  const role = privilegedAccountRole(roles);
  return role ? `/${role}-dashboard` : null;
}
export function workspaceProfile(profile, user) {
  const college = findCollege(profile?.college);
  const program = findProgram(college, profile?.program);
  return {
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
    email: user?.email || profile?.csu_email || "",
    studentId: profile?.student_id || "",
    phone: profile?.phone_number || "",
    bio: profile?.short_bio || "",
    interests: (profile?.study_interests || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    college: college?.name || profile?.college || "",
    program: program?.name || profile?.program || "",
    year: profile?.year_level ? String(profile.year_level) : "",
  };
}
