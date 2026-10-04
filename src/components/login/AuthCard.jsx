import { getSupabaseClient } from "../../services/supabaseClient.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import AuthTabs from "./AuthTabs.jsx";
import InputField from "./InputField.jsx";
import SecurityNotice from "./SecurityNotice.jsx";

function GoogleMark() {
  return (
    <span
      className="text-[16px] font-bold"
      style={{
        fontFamily: "Arial, sans-serif",
        background:
          "conic-gradient(from -45deg, #4285f4 0 25%, #34a853 0 40%, #fbbc05 0 65%, #ea4335 0 82%, #4285f4 0)",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }}
    >
      G
    </span>
  );
}

export default function AuthCard() {
  const [active, setActive] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const client = getSupabaseClient();
      const credentials = { email: email.trim(), password };
      if (!isLogin && (!firstName.trim() || !lastName.trim()))
        throw Error("Enter your first and last name.");
      if (!isLogin && !/@(carsu|csu)\.edu\.ph$/i.test(credentials.email))
        throw Error("Use your CSU email address.");
      const { data, error } = isLogin
        ? await client.auth.signInWithPassword(credentials)
        : await client.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: window.location.origin + "/login",
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
              },
            },
          });
      if (error) throw error;
      if (!data.session)
        setMessage("Check your email to confirm your account, then sign in.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function oauth() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/login" },
      });
      if (error) throw error;
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function forgot(e) {
    e.preventDefault();
    setMessage("");
    if (!email.trim()) return setMessage("Enter your email address first.");
    setBusy(true);
    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin + "/reset-password" },
      );
      if (error) throw error;
      setMessage(
        "If the address has an account, a password reset email will arrive.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const isLogin = active === "Login";
  return (
    <div className="mt-6 w-full max-w-[390px] overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-[0_6px_15px_rgba(0,0,0,.07)]">
      <div className="px-3 pb-2.5 pt-3 sm:px-4 sm:pb-3 sm:pt-3.5 lg:px-5 lg:pb-3.5 lg:pt-3">
        <header className="text-center">
          <h2 className="text-[18px] font-bold tracking-tight text-[#25262b] sm:text-[19px] lg:text-[20px]">
            {isLogin ? "Welcome back!" : "Create your account"}
          </h2>
          <p className="mt-0.5 text-[9px] text-[#96979e] sm:text-[10px]">
            {isLogin
              ? "Sign in to continue your learning journey."
              : "Join your CSU learning community."}
          </p>
        </header>
        <div className="mt-2">
          <AuthTabs active={active} onChange={setActive} />
        </div>
        <form
          className="mt-2 space-y-1.5 sm:mt-2.5 sm:space-y-2"
          onSubmit={submit}
        >
          {!isLogin && (
            <>
              <InputField
                icon={Mail}
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
              <InputField
                icon={Mail}
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </>
          )}
          <InputField
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            icon={Mail}
            label="CSU Email"
            type="email"
            placeholder="name@carsu.edu.ph"
            aria-label="CSU Email"
          />
          <InputField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            icon={LockKeyhole}
            label="Password"
            hint={
              isLogin && (
                <a
                  href="#forgot"
                  onClick={busy ? (e) => e.preventDefault() : forgot}
                  className="text-[12px] font-medium text-[#197747]"
                >
                  Forgot Password?
                </a>
              )
            }
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            aria-label="Password"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#44464d]">
            <input
              className="h-3 w-3 rounded border-[#d9dadd] accent-[#006b3c]"
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show password
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-8 w-full rounded-md bg-[#006b3c] text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#005932] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b3c]"
          >
            {busy
              ? "Please wait?"
              : isLogin
                ? "Continue with CSU Email"
                : "Register with CSU Email"}
          </button>
        </form>
        {(message || auth?.error) && (
          <p role="status" className="mt-2 text-xs text-red-700">
            {message || auth.error}
          </p>
        )}
        <div className="my-1.5 flex items-center gap-3 text-[10px] text-[#96979e] sm:my-2">
          <span className="h-px flex-1 bg-[#e9e9e9]" />
          or
          <span className="h-px flex-1 bg-[#e9e9e9]" />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={oauth}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[#a8c7b8] bg-white text-[11px] font-medium text-[#35363b] transition hover:bg-[#f8fbf9]"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </div>
      <SecurityNotice />
    </div>
  );
}
