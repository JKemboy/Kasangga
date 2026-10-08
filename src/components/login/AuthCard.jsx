import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import InputField from "./InputField.jsx";
import SecurityNotice from "./SecurityNotice.jsx";
import {
  sendLearnerOtp,
  verifyLearnerOtp,
  signInWithPortalPassword,
  learnerOtpMessage,
  otpRateLimited,
  PASSWORD_LOGIN_EMAILS,
} from "../../services/learnerOtp.js";

export default function AuthCard() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const portalPasswordLogin = PASSWORD_LOGIN_EMAILS.includes(
    email.trim().toLowerCase(),
  );
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function send() {
    if (busy || cooldown) return;
    setBusy(true);
    setError("");
    try {
      setSentTo(await sendLearnerOtp(sentTo || email));
      setOtp("");
      setCooldown(60);
    } catch (e) {
      setError(learnerOtpMessage(e));
      if (otpRateLimited(e)) setCooldown(60);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (!sentTo && portalPasswordLogin) {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
        await signInWithPortalPassword(email, password);
      } catch (e) {
        setError(learnerOtpMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!sentTo) return send();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyLearnerOtp(sentTo, otp);
    } catch (e) {
      setError(learnerOtpMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 w-full max-w-[390px] overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-md">
      <div className="space-y-4 p-5">
        <header className="text-center">
          <h2 className="text-xl font-bold">
            {sentTo ? "Check your email" : "Welcome back!"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {sentTo
              ? "Enter the verification code sent to " + sentTo
              : portalPasswordLogin
                ? "Enter your account password to sign in without an email code."
                : "Log in with your registered CSU email. We will email you a verification code."}
          </p>
        </header>
        <form onSubmit={submit} className="space-y-3">
          {sentTo ? (
            <InputField
              icon={ShieldCheck}
              label="Verification code"
              aria-label="Verification code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              maxLength={8}
              required
              autoFocus
            />
          ) : (
            <InputField
              icon={Mail}
              label="CSU Email"
              aria-label="CSU Email"
              type="email"
              placeholder="name@carsu.edu.ph"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          {!sentTo && portalPasswordLogin && (
            <InputField
              icon={KeyRound}
              label="Account password"
              aria-label="Account password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy || (!sentTo && !portalPasswordLogin && cooldown > 0)}
            className="w-full rounded-md bg-[#006b3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Signing in…"
              : sentTo
                ? "Verify and log in"
                : portalPasswordLogin
                  ? "Log in"
                  : cooldown
                    ? "Try again in " + cooldown + "s"
                    : "Send OTP"}
          </button>
        </form>
        {sentTo && (
          <div className="flex justify-between text-xs text-[#006b3c]">
            <button disabled={busy || cooldown > 0} onClick={send}>
              {cooldown ? "Resend in " + cooldown + "s" : "Resend OTP"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setSentTo("");
                setOtp("");
                setError("");
              }}
            >
              Change email
            </button>
          </div>
        )}
        <p className="text-center text-xs">
          New to CampusTutor?{" "}
          <Link to="/register" className="font-semibold text-[#006b3c]">
            Register with Google
          </Link>
        </p>
      </div>
      <SecurityNotice />
    </div>
  );
}
