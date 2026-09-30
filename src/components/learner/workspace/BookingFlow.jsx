import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Video,
  MapPin,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { button, primary, input, Avatar } from "../../tutor/workspace/ui.jsx";
import { portalApi, portalApiAvailable } from "../../../services/portalApi.js";
import { tutorProfile } from "./TutorProfile.jsx";
import "./booking.css";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const cash = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n,
  );
const labels = [
  "Service",
  "Topic",
  "Schedule",
  "Session Type",
  "Summary",
  "Payment",
];
export default function BookingFlow({ tutor: record, onComplete, onClose }) {
  const tutor = tutorProfile(record);
  const [step, setStep] = useState(1),
    [draft, setDraft] = useState({
      service: tutor.selectedService || "",
      topic: "",
      date: "",
      time: "",
      duration: "1.5",
      type: "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [reviewed, setReviewed] = useState(false),
    [consent, setConsent] = useState(false),
    [month, setMonth] = useState(() => new Date(today() + "T12:00:00"));
  const requestId = useRef(crypto.randomUUID());
  const services = tutor.services,
    selected = services.find((s) => s.name === draft.service),
    rate = Number(selected?.rate || tutor.rate) || 0,
    total = Math.round(rate * Number(draft.duration) * 100) / 100;
  const topics = Array.isArray(selected?.topics)
    ? selected.topics
    : String(selected?.topics || "")
        .split(",")
        .filter(Boolean);
  const types = selected?.types || tutor.types || ["Online", "In-person"];
  const change = (key, value) => {
    setError("");
    setReviewed(false);
    setConsent(false);
    requestId.current = crypto.randomUUID();
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === "service"
        ? { topic: "", type: "" }
        : key === "date" || key === "duration"
          ? { time: "" }
          : {}),
    }));
  };
  const valid =
    step === 1
      ? !!selected
      : step === 2
        ? !!draft.topic.trim()
        : step === 3
          ? !!draft.date && !!draft.time
          : step === 4
            ? !!draft.type
            : step === 5
              ? reviewed
              : consent && rate > 0 && portalApiAvailable("createBooking");
  const endTime = () => {
    const [h, m] = draft.time.split(":").map(Number);
    const end = h * 60 + m + Number(draft.duration) * 60;
    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  };
  async function next(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setError("");
    if (
      step >= 3 &&
      (new Date(`${draft.date}T${draft.time}:00+08:00`) <= new Date() ||
        endTime() > "21:00")
    )
      return setError(
        "Choose a future time with the session ending by 9:00 PM.",
      );
    if (step < 6) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const confirmed = await portalApi("createBooking", {
        ...draft,
        tutorId: tutor.id,
        tutor: tutor.name,
        idempotencyKey: requestId.current,
      });
      if (!confirmed?.bookingId || confirmed.paymentStatus !== "Paid")
        throw new Error(
          "Payment is not confirmed. Your booking is not complete.",
        );
      setResult(confirmed);
      if (
        onComplete({
          ...draft,
          ...confirmed,
          name: tutor.name,
          lifecycle: "Upcoming",
          paymentStatus: "Paid",
        }) === false
      )
        throw new Error(
          `Booking ${confirmed.bookingId} is confirmed, but could not be saved on this browser. Retry saving below.`,
        );
      setStep(7);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const summary = [
    ["Tutor", tutor.name],
    ["Service", draft.service],
    ["Specific topic", draft.topic],
    ["Date", draft.date],
    ["Time", draft.time ? `${draft.time} – ${endTime()}` : ""],
    ["Duration", `${draft.duration} hours`],
    ["Session type", draft.type],
    [
      "Location / Platform",
      draft.type === "Online"
        ? `${tutor.platform || "External meeting"} · Link shared after booking`
        : tutor.location || "To be arranged with the tutor",
    ],
  ];
  return (
    <form className="booking-flow" onSubmit={next} aria-busy={busy}>
      <header className="booking-tutor">
        <Avatar name={tutor.name} />
        <div>
          <strong>{tutor.name}</strong>
          <small>{tutor.degree || "Peer tutor"}</small>
        </div>
        <span>
          <b>{cash(rate)}</b> / hour
        </span>
      </header>
      <ol className="booking-steps">
        {labels.map((label, i) => (
          <li
            key={label}
            className={
              step === i + 1 ? "active" : step > i + 1 ? "complete" : ""
            }
            aria-current={step === i + 1 ? "step" : undefined}
          >
            <span>{step > i + 1 ? "✓" : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="booking-content">
        {step === 1 && (
          <>
            <h3>Select a subject or service</h3>
            <p className="booking-muted">
              Choose what you would like to learn with {tutor.name}.
            </p>
            <div className="booking-options">
              {services.map((s) => (
                <label
                  key={s.name}
                  className={draft.service === s.name ? "chosen" : ""}
                >
                  <input
                    type="radio"
                    name="service"
                    checked={draft.service === s.name}
                    onChange={() => change("service", s.name)}
                  />
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {Array.isArray(s.topics) && s.topics.length
                        ? `${s.topics.length} topics: ${s.topics.slice(0, 3).join(", ")}`
                        : "Choose a specific topic next"}
                    </small>
                  </span>
                  <b>{cash(Number(s.rate || tutor.rate) || 0)}/hr</b>
                </label>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3>Choose a specific topic</h3>
            <p className="booking-muted">{draft.service}</p>
            {topics.length ? (
              <div className="booking-options">
                {topics.map((t) => (
                  <label key={t} className={draft.topic === t ? "chosen" : ""}>
                    <input
                      type="radio"
                      name="topic"
                      checked={draft.topic === t}
                      onChange={() => change("topic", t)}
                    />
                    <strong>{t}</strong>
                  </label>
                ))}
              </div>
            ) : (
              <label className="booking-field">
                Specific topic
                <input
                  className={input}
                  value={draft.topic}
                  onChange={(e) => change("topic", e.target.value)}
                  required
                  maxLength={200}
                  placeholder="What would you like help with?"
                />
              </label>
            )}
          </>
        )}
        {step === 3 && (
          <div className="booking-columns">
            <section>
              <h3>Select a date</h3>
              <div className="booking-calendar">
                <header>
                  <button
                    type="button"
                    aria-label="Previous month"
                    className={button}
                    disabled={
                      month.getFullYear() === new Date(today()).getFullYear() &&
                      month.getMonth() === new Date(today()).getMonth()
                    }
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <strong>
                    {month.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  <button
                    type="button"
                    aria-label="Next month"
                    className={button}
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </header>
                <div className="booking-days">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <small key={"h" + i}>{d}</small>
                  ))}
                  {Array.from({ length: offset }, (_, i) => (
                    <span key={"blank" + i} />
                  ))}
                  {Array.from({ length: days }, (_, i) => {
                    const date = iso(
                      new Date(month.getFullYear(), month.getMonth(), i + 1),
                    );
                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={date < today()}
                        className={date === draft.date ? "selected" : ""}
                        aria-label={date}
                        aria-pressed={date === draft.date}
                        onClick={() => change("date", date)}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
            <section>
              <h3>Select a time range</h3>
              <div className="booking-duration">
                <span>Duration</span>
                {[1, 1.5, 2].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={Number(draft.duration) === n ? primary : button}
                    onClick={() => change("duration", String(n))}
                  >
                    {n} hr{n === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
              {draft.date ? (
                <>
                  <label className="booking-field">
                    Preferred start time
                    <input
                      className={input}
                      type="time"
                      value={draft.time}
                      min="07:00"
                      max="20:00"
                      step="1800"
                      required
                      onChange={(e) => change("time", e.target.value)}
                    />
                  </label>
                  <p className="booking-muted">
                    {draft.time && `${draft.time} – ${endTime()} · `}
                    {cash(total)} total
                  </p>
                </>
              ) : (
                <div className="booking-empty">
                  <CalendarDays size={28} />
                  <p>Pick a date to choose a time range.</p>
                </div>
              )}
              <p className="booking-note">
                These are preferred times. Tutor availability and scheduling
                conflicts must be verified before payment confirmation.
              </p>
            </section>
          </div>
        )}
        {step === 4 && (
          <>
            <h3>Choose your session type</h3>
            <p className="booking-muted">
              How would you like to meet your tutor?
            </p>
            <div className="booking-options">
              {types.map((type) => (
                <label
                  key={type}
                  className={draft.type === type ? "chosen" : ""}
                >
                  <input
                    type="radio"
                    name="sessionType"
                    checked={draft.type === type}
                    onChange={() => change("type", type)}
                  />
                  {type === "Online" ? (
                    <Video size={22} />
                  ) : (
                    <MapPin size={22} />
                  )}
                  <span>
                    <strong>{type}</strong>
                    <small>
                      {type === "Online"
                        ? `${tutor.platform || "Google Meet or Zoom"} · External meeting link shared after booking`
                        : tutor.location ||
                          "Arrange a campus meeting location with the tutor"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <p className="booking-note">
              CampusTutor has no built-in video or voice calls.
            </p>
          </>
        )}
        {step === 5 && (
          <>
            <h3>Review your booking</h3>
            <p className="booking-muted">
              Check your session details before continuing to payment.
            </p>
            <dl className="booking-summary">
              {summary.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="booking-total">
              <span>
                {cash(rate)} × {draft.duration} hours
              </span>
              <strong>{cash(total)}</strong>
            </div>
            <label className="booking-check">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed the session details. Cancellation does not
              automatically guarantee a refund; eligibility is reviewed
              separately.
            </label>
          </>
        )}
        {step === 6 && (
          <>
            <h3>Payment</h3>
            <p className="booking-muted">
              {draft.service} · {draft.topic} with {tutor.name}
            </p>
            <div className="booking-options">
              <label className="chosen">
                <input type="radio" name="paymentMethod" checked readOnly />
                <CreditCard size={24} />
                <span>
                  <strong>GCash via PayMongo</strong>
                  <small>
                    Payment status is verified before a booking is confirmed.
                  </small>
                </span>
              </label>
            </div>
            <div className="booking-total">
              <span>Total amount</span>
              <strong>{cash(total)}</strong>
            </div>
            <p className="booking-note">
              <ShieldCheck size={17} />
              Closing payment does not create a paid booking.
            </p>
            {!portalApiAvailable("createBooking") && (
              <p role="status" className="booking-warning">
                Payment checkout is not connected yet. Your selected details are
                ready, but no payment or booking can be completed here.
              </p>
            )}
            <label className="booking-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I authorize proceeding with payment for the session shown above.
            </label>
          </>
        )}
        {step === 7 && (
          <div className="booking-success">
            <ShieldCheck size={40} />
            <h3>Booking confirmed</h3>
            <p>Booking ID: {result.bookingId}</p>
            <p>Payment: Paid · {cash(total)}</p>
          </div>
        )}
        {error && (
          <p role="alert" className="booking-warning">
            {error}
          </p>
        )}
      </div>
      <footer className="booking-footer">
        {step < 7 ? (
          <>
            <button
              type="button"
              disabled={busy || !!result}
              className={button}
              onClick={() => {
                setError("");
                step === 1 ? onClose() : setStep(step - 1);
              }}
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {result ? (
              <button
                type="button"
                className={primary}
                onClick={() => {
                  if (
                    onComplete({
                      ...draft,
                      ...result,
                      name: tutor.name,
                      lifecycle: "Upcoming",
                      paymentStatus: "Paid",
                    }) !== false
                  ) {
                    setError("");
                    setStep(7);
                  }
                }}
              >
                Retry saving confirmed booking
              </button>
            ) : (
              <button disabled={!valid || busy} className={primary}>
                {busy
                  ? "Processing…"
                  : step === 5
                    ? "Proceed to Payment"
                    : step === 6
                      ? "Continue to GCash"
                      : "Continue"}
              </button>
            )}
          </>
        ) : (
          <button type="button" className={primary} onClick={onClose}>
            Done
          </button>
        )}
      </footer>
    </form>
  );
}
