import { isCsuEmail } from "./authAccount.js";
import { getSupabaseClient } from "./supabaseClient.js";

function inputError(code) {
  return Object.assign(new Error(code), { code });
}
export async function sendLearnerOtp(email, client = getSupabaseClient()) {
  const address = String(email || "")
    .trim()
    .toLowerCase();
  if (!isCsuEmail(address)) throw inputError("invalid_csu_email");
  const { error } = await client.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
  return address;
}
export async function verifyLearnerOtp(
  email,
  token,
  client = getSupabaseClient(),
) {
  const address = String(email || "")
    .trim()
    .toLowerCase();
  if (!isCsuEmail(address)) throw inputError("invalid_csu_email");
  if (!/^\d{6,8}$/.test(String(token || "").trim()))
    throw inputError("invalid_otp_input");
  const { data, error } = await client.auth.verifyOtp({
    email: address,
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
  if (
    !data?.session?.access_token ||
    !data.session.user?.id ||
    data.session.user.email?.toLowerCase() !== address
  )
    throw inputError("missing_otp_session");
  return data.session;
}
export function otpRateLimited(error) {
  return (
    error?.status === 429 ||
    ["over_email_send_rate_limit", "over_request_rate_limit"].includes(
      error?.code,
    )
  );
}
export function learnerOtpMessage(error) {
  if (otpRateLimited(error))
    return "Too many attempts. Please wait before trying again. If this continues, contact support.";
  switch (error?.code) {
    case "invalid_csu_email":
      return "Use your @carsu.edu.ph email address.";
    case "invalid_otp_input":
      return "Enter the verification code from your email.";
    case "otp_expired":
      return "This code is invalid or has expired. Use the latest email or request a new code.";
    case "otp_disabled":
    case "user_not_found":
    case "signup_disabled":
      return "We could not sign in with this email. If you have not registered yet, choose Register.";
    case "invalid_credentials":
      return "The code could not be verified. Check the latest code and try again.";
    case "missing_otp_session":
      return "Verification did not complete. Please request a new code and try again.";
    default:
      return "We could not complete your request. Check your connection and try again, or contact support.";
  }
}
