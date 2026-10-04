export const isCsuEmail = (email) =>
  /^[^\s@]+@carsu\.edu\.ph$/i.test(String(email || "").trim());
export async function loadAuthAccount(client, userId) {
  const [profile, roles] = await Promise.all([
    client
      .from("users")
      .select(
        "user_id,first_name,last_name,csu_email,student_id,college,program,year_level,account_status",
      )
      .eq("user_id", userId)
      .maybeSingle(),
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
      "Your Auth account exists, but its public.users profile is missing. Ask an administrator to provision your profile.",
    );
  if (profile.data.account_status !== "active")
    throw new Error("Your account is not active. Contact an administrator.");
  const allowed = (roles.data || [])
    .map((r) => r.role)
    .filter((r) => ["learner", "tutor", "admin", "osas"].includes(r));
  if (!allowed.length)
    throw new Error(
      "No active portal role is assigned. Ask an administrator to provision your account.",
    );
  return { profile: profile.data, roles: allowed };
}
export function accountHome(roles) {
  const role = ["admin", "osas", "tutor", "learner"].find((r) =>
    roles.includes(r),
  );
  return role ? `/${role}-dashboard` : "/login";
}
export function workspaceProfile(profile, user) {
  return {
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
    email: profile?.csu_email || user?.email || "",
    studentId: profile?.student_id || "",
    college: profile?.college || "",
    program: profile?.program || "",
    year: profile?.year_level ? String(profile.year_level) : "",
  };
}
