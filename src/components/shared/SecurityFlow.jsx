import { useCallback, useEffect, useState } from "react";
import { Field, button, primary } from "../tutor/workspace/ui.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { getSupabaseClient } from "../../services/supabaseClient.js";
import { useInteractions } from "./InteractionProvider.jsx";

export default function SecurityFlow({ mode, onClose }) {
  const { user } = useAuth();
  const { confirm } = useInteractions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [factors, setFactors] = useState([]);
  const [assurance, setAssurance] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [done, setDone] = useState(false);

  const loadFactors = useCallback(async () => {
    const auth = getSupabaseClient().auth;
    const [{ data, error: factorError }, { data: level }] = await Promise.all([
      auth.mfa.listFactors(),
      auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (factorError) throw factorError;
    setFactors(data?.totp || []);
    setAssurance(level || null);
  }, []);

  useEffect(() => {
    if (mode !== "Manage Security") return;
    loadFactors().catch((cause) => setError(cause.message));
  }, [loadFactors, mode]);

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (
      values.newPassword.length < 8 ||
      !/[0-9]/.test(values.newPassword) ||
      values.newPassword === values.currentPassword ||
      values.newPassword !== values.confirmPassword
    ) {
      setError("Use a new password with at least 8 characters and one number. Both new password fields must match.");
      return;
    }
    setPending(true);
    try {
      const client = getSupabaseClient();
      const { error: reauthError } = await client.auth.signInWithPassword({
        email: user?.email,
        password: values.currentPassword,
      });
      if (reauthError) {
        throw new Error("Current password could not be verified. If this account uses CSU or Google sign-in, update its password through that identity provider.");
      }
      const { error: updateError } = await client.auth.updateUser({
        password: values.newPassword,
      });
      if (updateError) throw updateError;
      setDone(true);
    } catch (cause) {
      setError(cause.message || "Could not update the password.");
    } finally {
      setPending(false);
    }
  }

  async function enrollAuthenticator() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const { data, error: enrollError } = await getSupabaseClient().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "CampusTutor authenticator",
        issuer: "CampusTutor",
      });
      if (enrollError) throw enrollError;
      setEnrollment(data);
    } catch (cause) {
      setError(cause.message || "Could not start authenticator enrollment.");
    } finally {
      setPending(false);
    }
  }

  async function verifyAuthenticator(event) {
    event.preventDefault();
    if (!enrollment || !/^\d{6}$/.test(verificationCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const client = getSupabaseClient();
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
        factorId: enrollment.id,
      });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await client.auth.mfa.verify({
        factorId: enrollment.id,
        challengeId: challenge.id,
        code: verificationCode,
      });
      if (verifyError) throw verifyError;
      setEnrollment(null);
      setVerificationCode("");
      setNotice("Authenticator app enabled for your account.");
      await loadFactors();
    } catch (cause) {
      setError(cause.message || "The verification code was not accepted.");
    } finally {
      setPending(false);
    }
  }

  async function removeFactor(factor) {
    if (!(await confirm({
      title: "Remove authenticator?",
      message: "Two-factor authentication from this authenticator will be removed from your account.",
      accept: "Remove Authenticator",
      danger: true,
    }))) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const { error: removeError } = await getSupabaseClient().auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (removeError) throw removeError;
      setNotice("Authenticator removed.");
      await loadFactors();
    } catch (cause) {
      setError(cause.message || "Could not remove the authenticator.");
    } finally {
      setPending(false);
    }
  }

  if (mode === "Change Password") {
    return done ? (
      <div className="space-y-3 text-xs">
        <p role="status" className="text-green-800">Password changed successfully.</p>
        <div className="flex justify-end"><button type="button" className={primary} onClick={onClose}>Done</button></div>
      </div>
    ) : (
      <form onSubmit={changePassword} className="space-y-3" aria-busy={pending}>
        <Field label="Current Password" name="currentPassword" type="password" autoComplete="current-password" required />
        <Field label="New Password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        <Field label="Confirm New Password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className={button} onClick={onClose} disabled={pending}>Cancel</button><button className={primary} disabled={pending}>{pending ? "Updating…" : "Update Password"}</button></div>
      </form>
    );
  }

  return (
    <div className="space-y-4 text-sm" aria-busy={pending}>
      <p className="text-slate-600">Set up an authenticator app for a second sign-in factor. Sign-in enforcement follows the institution’s Supabase authentication policy.</p>
      {assurance && <p className="rounded border bg-slate-50 p-2 text-xs">Current session: {assurance.currentLevel || "aal1"} · Account requirement: {assurance.nextLevel || "aal1"}</p>}
      {factors.filter((factor) => factor.status === "verified").map((factor) => (
        <div key={factor.id} className="flex items-center justify-between gap-3 rounded border p-3">
          <span><b>{factor.friendly_name || "Authenticator app"}</b><small className="mt-1 block text-xs text-green-800">Active</small></span>
          <button type="button" className={button} disabled={pending} onClick={() => removeFactor(factor)}>Remove</button>
        </div>
      ))}
      {enrollment ? (
        <form onSubmit={verifyAuthenticator} className="space-y-3 rounded border p-3">
          <p className="text-xs">Scan this code in your authenticator app, then enter its 6-digit code.</p>
          <img className="mx-auto h-44 w-44 rounded border bg-white p-2" alt="Authenticator setup QR code" src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.totp.qr_code)}`} />
          <label className="block text-xs font-medium">Setup key<input className="mt-1 w-full rounded border p-2 font-mono" readOnly value={enrollment.totp.secret} /></label>
          <label className="block text-xs font-medium">Verification code<input className="mt-1 w-full rounded border p-2" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" /></label>
          <div className="flex justify-end gap-2"><button type="button" className={button} disabled={pending} onClick={() => setEnrollment(null)}>Cancel</button><button className={primary} disabled={pending || verificationCode.length !== 6}>Verify and Enable</button></div>
        </form>
      ) : !factors.some((factor) => factor.status === "verified") ? (
        <button type="button" className={primary} disabled={pending} onClick={enrollAuthenticator}>{pending ? "Loading…" : "Set Up Authenticator App"}</button>
      ) : null}
      {notice && <p role="status" className="text-xs text-green-800">{notice}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
