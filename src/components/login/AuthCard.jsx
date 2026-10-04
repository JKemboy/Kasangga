import { isCsuEmail } from "../../services/authAccount.js";
import { getSupabaseClient } from "../../services/supabaseClient.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useEffect, useState } from "react";
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

  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function sendCode() {
    if (cooldown > 0) return;
    const address = email.trim().toLowerCase();
    if (!isCsuEmail(address))
      throw Error("Use your @carsu.edu.ph email address.");
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: active === "Register" },
    });
    if (error) {
      if (
        error.status === 429 ||
        error.code === "over_email_send_rate_limit" ||
        error.code === "over_request_rate_limit"
      ) {
        setCooldown(60);
        throw Error(
          "Email requests are temporarily limited by Supabase. Wait before trying again. If this continues, the administrator must check the email quota and SMTP setup. This retry timer does not indicate when the server quota resets.",
        );
      }
      throw error;
    }
    setSentTo(address);
    setCode("");
    setCooldown(60);
    setMessage("Check your CSU inbox for your verification code.");
  }
  async function submit(e) {
    e.preventDefault();
    if (busy || (!sentTo && cooldown > 0)) return;
    setBusy(true);
    setMessage("");
    try {
      if (!sentTo) await sendCode();
      else {
        if (!/^\d{6,8}$/.test(code.trim()))
          throw Error("Enter the code from your email.");
        const { error } = await getSupabaseClient().auth.verifyOtp({
          email: sentTo,
          token: code.trim(),
          type: "email",
        });
        if (error) throw error;
      }
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (busy || cooldown) return;
    setBusy(true);
    setMessage("");
    try {
      await sendCode();
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
        options: {
          redirectTo: window.location.origin + "/login",
          queryParams: { hd: "carsu.edu.ph", prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const isLogin = active === "Login";
  if (auth?.temporaryLoginEnabled && isLogin)
    return (
      <div className="mt-6 w-full max-w-[390px] rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-center text-xl font-bold">Welcome back!</h2>
        <div className="my-3">
          <AuthTabs active={active} onChange={setActive} />
        </div>
        <p className="mb-4 text-center text-sm text-slate-500">
          Temporary Learner access. No verification required.
        </p>
        <button
          disabled={busy}
          className="h-10 w-full rounded-md bg-[#006b3c] text-sm font-semibold text-white"
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await auth.startTemporaryLearner();
            } catch (e) {
              setMessage(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Opening..." : "Login as Learner"}
        </button>
        {message && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {message}
          </p>
        )}
      </div>
    );
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
          <AuthTabs
            active={active}
            onChange={(value) => {
              if (busy) return;
              setActive(value);
              setSentTo("");
              setCode("");
              setMessage("");
            }}
          />
        </div>
        <form
          className="mt-2 space-y-1.5 sm:mt-2.5 sm:space-y-2"
          onSubmit={submit}
        >
          <InputField
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!sentTo || busy}
            autoComplete="email"
            icon={Mail}
            label="CSU Email"
            type="email"
            placeholder="name@carsu.edu.ph"
          />
          {sentTo && (
            <InputField
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              required
              icon={LockKeyhole}
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={6}
              maxLength={8}
            />
          )}
          <button
            type="submit"
            disabled={busy || (!sentTo && cooldown > 0)}
            className="h-8 w-full rounded-md bg-[#006b3c] text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#005932] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b3c]"
          >
            {busy
              ? "Please wait..."
              : sentTo
                ? "Verify code"
                : cooldown > 0
                  ? `Try again in ${cooldown}s`
                  : "Send verification code"}
          </button>
        </form>
        {sentTo && (
          <div className="mt-2 flex justify-between text-xs">
            <button disabled={busy || cooldown > 0} onClick={resend}>
              {cooldown ? "Resend in " + cooldown + "s" : "Resend code"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setSentTo("");
                setCode("");
                setMessage("");
              }}
            >
              Change email
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Exclusive to @carsu.edu.ph accounts. No password required.
        </p>
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
