// Booking flow: validates the selected tutor topic and time, then hands checkout to the booking/payment service.
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { button, primary, input, Avatar } from "../../tutor/workspace/ui.jsx";
import { portalApi, portalApiAvailable } from "../../../services/portalApi.js";
import { listBookableAvailability } from "../../../services/tutorAvailability.js";
import { availableBookingTimes } from "../../../services/availabilityTimes.js";
import {
  bookingTotal,
  chooseBookingType,
} from "../../../services/bookingSelection.js";
import {
  loadServiceTopicSettings,
  withTopicSettings,
} from "../../../services/tutorServices.js";
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
      sessions: [],
      service: tutor.selectedService || "",
      topic: "",
      date: "",
      duration: "1",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [reviewed, setReviewed] = useState(false),
    [consent, setConsent] = useState(false),
    [month, setMonth] = useState(() => new Date(today() + "T12:00:00"));
  const requestId = useRef(crypto.randomUUID());
  const [checkoutCleaning, setCheckoutCleaning] = useState(true);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutRetry, setCheckoutRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setCheckoutCleaning(true);
    setCheckoutError("");
    portalApi("discardUnpaidCheckout")
      .catch((error) => {
        if (active) setCheckoutError(error.message);
      })
      .finally(() => {
        if (active) setCheckoutCleaning(false);
      });
    return () => {
      active = false;
    };
  }, [checkoutRetry]);
  const [services, setServices] = useState(tutor.services);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");
  useEffect(() => {
    let active = true;
    loadServiceTopicSettings(tutor.services.map((service) => service.id))
      .then((rows) => {
        if (active) {
          setServices(
            tutor.services.map((service) => withTopicSettings(service, rows)),
          );
          setTopicsError("");
        }
      })
      .catch((error) => {
        if (active) setTopicsError(error.message);
      })
      .finally(() => {
        if (active) setTopicsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [record]);
  const selected = services.find((s) => s.name === draft.service),
    topicConfig = selected?.topicDetails?.find(
      (topic) => topic.name === draft.topic,
    ),
    rate = Number(topicConfig?.rate ?? selected?.rate ?? tutor.rate) || 0,
    totalHours = draft.sessions.reduce(
      (sum, session) => sum + Number(session.duration),
      0,
    ),
    total = bookingTotal(draft.sessions, rate);
  const topics = Array.isArray(selected?.topics)
    ? selected.topics
    : String(selected?.topics || "")
        .split(",")
        .filter(Boolean);
  const types =
    topicConfig?.types ||
    (selected?.type === "Both"
      ? ["Online", "In-person"]
      : selected?.type
        ? [selected.type]
        : selected?.types || tutor.types || ["Online", "In-person"]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [classBlocks, setClassBlocks] = useState([]);
  const [bookingBlocks, setBookingBlocks] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const availabilityRequest = useRef(0);
  const availabilityReady = useRef(false);
  useEffect(() => {
    const current = ++availabilityRequest.current;
    availabilityReady.current = false;
    if (step !== 3 || !selected?.id || !tutor.tutorProfileId) {
      setAvailabilitySlots([]);
      setClassBlocks([]);
      setAvailabilityLoading(false);
      setAvailabilityError("");
      return;
    }
    setAvailabilitySlots([]);
    setAvailabilityLoading(true);
    setAvailabilityError("");
    const refresh = () =>
      listBookableAvailability(tutor.tutorProfileId, selected.id)
        .then(({ slots, classBlocks: blocks, bookingBlocks: booked }) => {
          if (current === availabilityRequest.current) {
            availabilityReady.current = true;
            setAvailabilitySlots(slots);
            setClassBlocks(blocks);
            setBookingBlocks(booked);
            setAvailabilityError("");
          }
        })
        .catch((loadError) => {
          if (current === availabilityRequest.current)
            setAvailabilityError(
              loadError.message || "Could not load tutor availability.",
            );
        })
        .finally(() => {
          if (current === availabilityRequest.current)
            setAvailabilityLoading(false);
        });
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      if (current === availabilityRequest.current)
        availabilityRequest.current++;
    };
  }, [step, selected?.id, tutor.tutorProfileId]);
  const availableTimes = availableBookingTimes(
    availabilitySlots,
    draft.date,
    draft.duration,
    selected?.id,
    undefined,
    classBlocks,
    bookingBlocks,
    topicConfig?.id,
  );
  const displayedTimes = availableBookingTimes(
    availabilitySlots,
    draft.date,
    1,
    selected?.id,
    undefined,
    classBlocks,
    [],
    topicConfig?.id,
  );
  const timesForDate = (date) =>
    availableBookingTimes(
      availabilitySlots,
      date,
      draft.duration,
      selected?.id,
      undefined,
      classBlocks,
      bookingBlocks,
      topicConfig?.id,
    );
  const rangeLabel = (time, duration = draft.duration) => {
    const [h, m] = time.split(":").map(Number);
    const format = (minutes) =>
      new Date(
        2000,
        0,
        1,
        Math.floor(minutes / 60),
        minutes % 60,
      ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return (
      format(h * 60 + m) + " - " + format(h * 60 + m + Number(duration) * 60)
    );
  };
  useEffect(() => {
    if (
      step !== 3 ||
      !availabilityReady.current ||
      availabilityLoading ||
      availabilityError
    )
      return;
    const remaining = draft.sessions.flatMap((session) => {
      const option = availableBookingTimes(
        availabilitySlots,
        session.date,
        session.duration,
        selected?.id,
        undefined,
        classBlocks,
        bookingBlocks,
        topicConfig?.id,
      ).find((option) => option.value === session.time);
      return option ? [{ ...session, slotId: option.slotId }] : [];
    });
    if (remaining.length !== draft.sessions.length) {
      setDraft((d) => ({ ...d, sessions: remaining }));
      setError(
        "Some selected times are no longer available. Please review your sessions.",
      );
      setReviewed(false);
      setConsent(false);
      requestId.current = crypto.randomUUID();
    } else if (
      remaining.some(
        (session, index) => session.slotId !== draft.sessions[index].slotId,
      )
    ) {
      setDraft((d) => ({ ...d, sessions: remaining }));
      setReviewed(false);
      setConsent(false);
      requestId.current = crypto.randomUUID();
    }
  }, [
    step,
    availabilityLoading,
    availabilityError,
    availabilitySlots,
    classBlocks,
    bookingBlocks,
    topicConfig?.id,
    draft.sessions,
    selected?.id,
  ]);
  const sessionKey = (session) => session.date + "T" + session.time;
  const minutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const overlaps = (option) =>
    draft.sessions.some(
      (session) =>
        session.date === draft.date &&
        minutes(option.value) <
          minutes(session.time) + Number(session.duration) * 60 &&
        minutes(option.value) + Number(draft.duration) * 60 >
          minutes(session.time),
    );
  const toggleTime = (option) => {
    const key = draft.date + "T" + option.value;
    if (draft.sessions.some((session) => sessionKey(session) === key))
      return change(
        "sessions",
        draft.sessions.filter((session) => sessionKey(session) !== key),
      );
    if (overlaps(option) || draft.sessions.length >= 20) return;
    change(
      "sessions",
      [
        ...draft.sessions,
        {
          date: draft.date,
          time: option.value,
          duration: draft.duration,
          slotId: option.slotId,
          type: types.length === 1 ? types[0] : "",
        },
      ].sort((a, b) => sessionKey(a).localeCompare(sessionKey(b))),
    );
  };
  const setSessionType = (key, type) =>
    change("sessions", chooseBookingType(draft.sessions, key, type, types));
  const sessionDate = (date) =>
    new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const change = (key, value) => {
    setError("");
    setReviewed(false);
    setConsent(false);
    requestId.current = crypto.randomUUID();
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === "service"
        ? { topic: "", date: "", sessions: [] }
        : key === "topic"
          ? { date: "", sessions: [] }
          : {}),
    }));
  };
  const valid =
    step === 1
      ? !!selected
      : step === 2
        ? !!draft.topic.trim() && !topicsLoading && !topicsError
        : step === 3
          ? draft.sessions.length > 0 &&
            !availabilityLoading &&
            !availabilityError
          : step === 4
            ? draft.sessions.length > 0 &&
              draft.sessions.every((session) => types.includes(session.type))
            : step === 5
              ? reviewed
              : consent && rate > 0 && portalApiAvailable("createBooking");
  async function next(e) {
    e.preventDefault();
    if (!valid || busy || (step === 6 && (checkoutCleaning || checkoutError)))
      return;
    setError("");
    if (
      step >= 3 &&
      draft.sessions.some(
        (session) =>
          new Date(session.date + "T" + session.time + ":00+08:00") <=
            new Date() ||
          minutes(session.time) + Number(session.duration) * 60 > 21 * 60,
      )
    )
      return setError("Choose future sessions ending by 9:00 PM.");
    if (step < 6) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const confirmed = await portalApi("createBooking", {
        ...draft,
        serviceId: selected.id,
        topicId: topicConfig?.id || null,
        tutorId: tutor.id,
        tutor: tutor.name,
        idempotencyKey: requestId.current,
      });
      if (!confirmed?.checkoutUrl) {
        throw new Error("PayMongo checkout URL was not returned.");
      }

      const checkoutUrl = new URL(confirmed.checkoutUrl);
      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.paymongo.com"
      ) {
        throw new Error("PayMongo returned an invalid checkout URL.");
      }

      window.location.assign(checkoutUrl.href);
      return;
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
    ["Sessions", draft.sessions.length],
    ["Duration", totalHours + " hours"],
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
        {step === 6 && checkoutCleaning && (
          <p role="status">Checking previous unpaid checkout...</p>
        )}
        {step === 6 && checkoutError && (
          <p role="alert" className="booking-warning">
            {checkoutError}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setCheckoutRetry((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {topicsError && (
          <p className="booking-warning" role="alert">
            {topicsError}
          </p>
        )}
        {topicsLoading && (
          <p role="status">Loading topic rates and schedules...</p>
        )}
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
                    <span>
                      <strong>{t}</strong>
                      <small>
                        {selected?.topicDetails
                          ?.find((topic) => topic.name === t)
                          ?.types.join(" / ")}
                      </small>
                    </span>
                    <b>
                      {cash(
                        selected?.topicDetails?.find(
                          (topic) => topic.name === t,
                        )?.rate ??
                          selected?.rate ??
                          rate,
                      )}
                      /hr
                    </b>
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
                        disabled={
                          date < today() ||
                          availabilityLoading ||
                          !!availabilityError ||
                          !timesForDate(date).length
                        }
                        className={
                          date === draft.date ||
                          draft.sessions.some(
                            (session) => session.date === date,
                          )
                            ? "selected"
                            : timesForDate(date).length
                              ? "available"
                              : ""
                        }
                        aria-label={date}
                        aria-pressed={date === draft.date}
                        onClick={() => change("date", date)}
                      >
                        {i + 1}
                        {timesForDate(date).length > 0 && (
                          <span
                            className="booking-availability-dot"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="booking-legend">
                <span className="booking-availability-dot" /> Available{" "}
                <span className="booking-selected-key" /> Selected
              </p>
              {availabilityLoading && (
                <p role="status">Loading availability...</p>
              )}
              {availabilityError && (
                <p role="alert" className="booking-warning">
                  {availabilityError}
                </p>
              )}
            </section>
            <section>
              <h3>Select time ranges</h3>
              <p className="booking-muted">
                Each session is 1 hour. Select one or more times, on one or more
                dates.
              </p>
              {draft.date ? (
                <>
                  <strong className="booking-date-title">
                    {new Date(draft.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </strong>
                  {availabilityLoading ? (
                    <p role="status">Loading available times...</p>
                  ) : (
                    <div className="booking-time-grid">
                      {displayedTimes.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={
                            draft.sessions.some(
                              (session) =>
                                sessionKey(session) ===
                                draft.date + "T" + option.value,
                            )
                              ? "selected"
                              : ""
                          }
                          aria-pressed={draft.sessions.some(
                            (session) =>
                              sessionKey(session) ===
                              draft.date + "T" + option.value,
                          )}
                          disabled={
                            !availableTimes.some(
                              (available) => available.value === option.value,
                            ) ||
                            !!availabilityError ||
                            (!draft.sessions.some(
                              (session) =>
                                sessionKey(session) ===
                                draft.date + "T" + option.value,
                            ) &&
                              (overlaps(option) || draft.sessions.length >= 20))
                          }
                          onClick={() => toggleTime(option)}
                        >
                          <span
                            className="booking-availability-dot"
                            aria-hidden="true"
                          />
                          {rangeLabel(option.value)}
                          {!availableTimes.some(
                            (available) => available.value === option.value,
                          ) && <small>Booked</small>}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="booking-muted">
                    Booked times cannot be selected. Times outside the tutor's
                    availability are hidden.
                  </p>
                  {availabilityError && (
                    <p role="alert" className="booking-warning">
                      {availabilityError}
                    </p>
                  )}
                  {!availabilityLoading &&
                    !availabilityError &&
                    !availableTimes.length && (
                      <p role="status" className="booking-note">
                        No free one-hour sessions on this day. Choose another
                        date.
                      </p>
                    )}
                </>
              ) : (
                <div className="booking-empty">
                  <CalendarDays size={28} />
                  <p>Pick a date to choose a time range.</p>
                </div>
              )}
              {draft.sessions.length > 0 && (
                <div className="booking-selection">
                  <strong>Selected ({draft.sessions.length})</strong>
                  {draft.sessions.map((session) => (
                    <div key={sessionKey(session)}>
                      <span>
                        {sessionDate(session.date)} &middot;{" "}
                        {rangeLabel(session.time, session.duration)}
                      </span>
                      <button
                        type="button"
                        aria-label={
                          "Remove " +
                          sessionDate(session.date) +
                          " " +
                          session.time
                        }
                        onClick={() =>
                          change(
                            "sessions",
                            draft.sessions.filter(
                              (item) =>
                                sessionKey(item) !== sessionKey(session),
                            ),
                          )
                        }
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <div className="booking-total">
                    <span>
                      {draft.sessions.length} &times; 1 hour &times;{" "}
                      {cash(rate)}/hour
                    </span>
                    <strong>{cash(total)}</strong>
                  </div>
                </div>
              )}
              <p className="booking-note">
                Available times refresh automatically. Availability is checked
                again before checkout.
              </p>
            </section>
          </div>
        )}
        {step === 4 && (
          <>
            <h3>Choose a session type for each time</h3>
            <p className="booking-muted">
              {draft.service} is available {types.join(" and ").toLowerCase()}.
              {types.includes("Online") && (
                <>
                  {" "}
                  Online meeting:{" "}
                  {topicConfig?.meetingLink ||
                    tutor.platform ||
                    "Meeting link shared after booking"}
                  .
                </>
              )}
              {types.includes("In-person") && (
                <>
                  {" "}
                  In-person meeting:{" "}
                  {topicConfig?.location ||
                    tutor.location ||
                    "Location arranged with tutor"}
                  .
                </>
              )}
            </p>
            <div className="booking-set-all">
              <span>Set all to:</span>
              {["Online", "In-person"].map((type) => (
                <button
                  type="button"
                  key={type}
                  className={button}
                  disabled={!types.includes(type)}
                  onClick={() => setSessionType("all", type)}
                >
                  {type}
                </button>
              ))}
              <small>
                {
                  draft.sessions.filter((session) =>
                    types.includes(session.type),
                  ).length
                }{" "}
                of {draft.sessions.length} chosen
              </small>
            </div>
            <div className="booking-session-types">
              {draft.sessions.map((session) => (
                <div
                  className="booking-session-type-row"
                  key={sessionKey(session)}
                >
                  <strong>
                    {sessionDate(session.date)} &middot;{" "}
                    {rangeLabel(session.time, session.duration)}
                  </strong>
                  <div>
                    {["Online", "In-person"].map((type) => (
                      <label
                        key={type}
                        className={
                          !types.includes(type)
                            ? "unavailable"
                            : session.type === type
                              ? "chosen"
                              : ""
                        }
                      >
                        <input
                          type="radio"
                          name={"session-type-" + sessionKey(session)}
                          checked={session.type === type}
                          disabled={!types.includes(type)}
                          onChange={() =>
                            setSessionType(sessionKey(session), type)
                          }
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
            <div className="booking-session-types">
              {draft.sessions.map((session) => (
                <div
                  className="booking-session-type-row"
                  key={sessionKey(session)}
                >
                  <span>
                    {sessionDate(session.date)} &middot;{" "}
                    {rangeLabel(session.time, session.duration)}
                    <small>
                      {session.type} &middot;{" "}
                      {session.type === "Online"
                        ? topicConfig?.meetingLink ||
                          tutor.platform ||
                          "Meeting link shared after booking"
                        : topicConfig?.location ||
                          tutor.location ||
                          "Location arranged with tutor"}
                    </small>
                  </span>
                  <strong>{cash(rate * Number(session.duration))}</strong>
                </div>
              ))}
            </div>
            <div className="booking-total">
              <span>
                {cash(rate)} × {totalHours} hours ({draft.sessions.length}{" "}
                sessions)
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
              I authorize proceeding with payment for all sessions shown above.
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
              <button
                disabled={
                  !valid ||
                  busy ||
                  (step === 6 && (checkoutCleaning || !!checkoutError))
                }
                className={primary}
              >
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
