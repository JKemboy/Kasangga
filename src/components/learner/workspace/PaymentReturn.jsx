import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { listLearnerSessions } from "../../../services/learnerSessions.js";
import {
  paymentBookingIds,
  confirmedPaymentSessions,
} from "../../../services/paymentReturn.js";
import { Modal, primary, button } from "../../tutor/workspace/ui.jsx";
const cash = (amount) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    amount,
  );
export default function PaymentReturn() {
  const location = useLocation();
  const navigate = useNavigate();
  const returning =
    new URLSearchParams(location.search).get("payment") === "success";
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!returning) return;
    let active = true,
      timer,
      attempts = 0;
    const ids = paymentBookingIds(location.search);
    setSessions([]);
    setError("");
    setWaiting(true);
    async function check() {
      if (!ids.length) {
        setWaiting(false);
        setError(
          "This payment return does not identify a booking. Check My Sessions for your confirmed bookings.",
        );
        return;
      }
      attempts++;
      try {
        const rows = await listLearnerSessions();
        if (!active) return;
        const confirmed = confirmedPaymentSessions(rows, ids);
        if (confirmed.length) {
          setSessions(confirmed);
          setWaiting(false);
          setError("");
          window.dispatchEvent(new Event("campustutor:sessions-changed"));
          return;
        }
        if (attempts >= 30) {
          setWaiting(false);
          setError(
            "Your payment is still being verified. Retry shortly or check My Sessions.",
          );
          return;
        }
        timer = window.setTimeout(check, 2000);
      } catch (error) {
        if (active) {
          setWaiting(false);
          setError(error.message);
        }
      }
    }
    check();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [returning, location.search, retry]);
  if (!returning) return null;
  const close = (section) => {
    const params = new URLSearchParams(location.search);
    params.delete("payment");
    params.delete("booking_ids");
    if (section === "sessions") params.set("section", "sessions");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
        hash: location.hash,
      },
      { replace: true },
    );
  };
  return (
    <Modal
      title={sessions.length ? "Booking Confirmed" : "Verifying Your Booking"}
      onClose={close}
    >
      {waiting && (
        <p role="status" className="py-4 text-sm">
          Waiting for payment confirmation from Supabase...
        </p>
      )}
      {error && (
        <div className="space-y-3 py-4">
          <p role="alert" className="text-sm text-amber-800">
            {error}
          </p>
          <button
            className={button}
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry verification
          </button>
        </div>
      )}
      {sessions.length > 0 && (
        <div className="space-y-4 py-3">
          <p className="flex items-center gap-2 font-semibold text-green-800">
            <ShieldCheck /> Payment received. Your booking is confirmed.
          </p>
          {sessions.map((session) => (
            <article
              key={session.id}
              className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs"
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                {[
                  ["Booking ID", session.id],
                  ["Tutor", session.name],
                  ["Service / Subject", session.course],
                  ["Topic", session.topic],
                  ["Date", session.date],
                  ["Time", session.time],
                  ["Duration", session.duration + " hour(s)"],
                  ["Session Type", session.type],
                  ["Venue / Platform", session.venue],
                  ["Amount Paid", cash(session.amount)],
                ].map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="font-medium">{label}</dt>
                    <dd>{value || "To be arranged"}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
          <p className="text-right text-sm font-semibold">
            Total Paid:{" "}
            {cash(sessions.reduce((sum, session) => sum + session.amount, 0))}
          </p>
        </div>
      )}
      <div className="mt-3 flex justify-between gap-3">
        <button className={button} onClick={close}>
          Close
        </button>
        <button className={primary} onClick={() => close("sessions")}>
          View My Sessions
        </button>
      </div>
    </Modal>
  );
}
