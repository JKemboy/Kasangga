import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SecurityNotice from "./SecurityNotice.jsx";
import { registerWithGoogle } from "../../services/googleRegistration.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { getSupabaseClient } from "../../services/supabaseClient.js";
import { accountHome } from "../../services/authAccount.js";
import { useNavigate } from "react-router-dom";
export default function RegisterCard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return query.has("error") || hash.has("error")
      ? "Google registration was not completed. Please try again."
      : "";
  });
  useEffect(() => {
    const nonce = new URLSearchParams(window.location.search).get("terms_nonce");
    if (!nonce) return;
    let active = true;
    const recordAcceptance = async () => {
      if (!auth.user || auth.loading) return;
      try {
        const { error: acceptanceError } = await getSupabaseClient().rpc(
          "record_terms_acceptance",
          { p_nonce: nonce },
        );
        if (acceptanceError) throw acceptanceError;
        window.history.replaceState({}, "", "/register");
        if (active) navigate(accountHome(auth.roles), { replace: true });
      } catch (cause) {
        if (active)
          setError(
            cause.message ||
              "Could not save your Terms & Conditions acceptance. Please retry registration.",
          );
      }
    };
    recordAcceptance();
    return () => {
      active = false;
    };
  }, [auth.user, auth.loading, auth.roles, navigate]);
  async function register() {
    if (busy) return;
    if (!acceptedTerms) {
      setError("Please accept the Terms & Conditions before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await registerWithGoogle(window.location.origin, acceptedTerms);
    } catch (cause) {
      setError(
        `Could not start Google registration: ${cause.message || "Please try again or contact support."}`,
      );
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 w-full max-w-[390px] overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-md">
      <div className="space-y-5 p-5 text-center">
        <header>
          <h2 className="text-xl font-bold">Create your account</h2>
          <p className="mt-2 text-sm text-slate-500">
            Join CampusTutor using your CSU Google account. No password to
            create.
          </p>
        </header>
        <label className="flex items-start gap-2 text-left text-xs leading-5 text-slate-600">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked);
              setError("");
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-[#006b3c]"
          />
          <span>
            I have read and agree to the{" "}
            <a
              href="/CampusTutor-Terms-Conditions.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#006b3c] underline underline-offset-2"
              onClick={(event) => event.stopPropagation()}
            >
              Terms &amp; Conditions
            </a>
            .
          </span>
        </label>
        <button
          onClick={register}
          disabled={busy || !acceptedTerms}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-[#a8c7b8] px-4 py-3 text-sm font-semibold hover:bg-green-50 disabled:opacity-50"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#4285F4"
              d="M43.6 24.5c0-1.5-.1-2.9-.4-4.3H24v8.2h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15.2Z"
            />
            <path
              fill="#34A853"
              d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"
            />
            <path
              fill="#FBBC05"
              d="M12.6 27.5a12.3 12.3 0 0 1 0-7V15.3H5.8a20 20 0 0 0 0 17.4Z"
            />
            <path
              fill="#EA4335"
              d="M24 12.1c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.3l6.8 5.2C14.2 15.7 18.7 12.1 24 12.1Z"
            />
          </svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Choose your @carsu.edu.ph account.
        </p>
        <p className="text-xs">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-[#006b3c]">
            Log in with email OTP
          </Link>
        </p>
      </div>
      <SecurityNotice />
    </div>
  );
}
