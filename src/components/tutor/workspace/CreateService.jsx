import {
  CSU_MEETING_PLACES,
  MAX_SERVICE_RATE,
  formatServiceDate,
  splitMeetingLocation,
  combineMeetingLocation,
} from "../../../services/serviceFormOptions.js";
import { loadMyTutorApplication } from "../../../services/tutorApplications.js";
import { useAuth } from "../../../auth/AuthProvider.jsx";
// Service editor: builds a tutor service and topic schedule; save callbacks enforce booking-aware edit restrictions.
import { useEffect, useState } from "react";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { Modal, Field, input, button, primary } from "./ui.jsx";
import { hour, time, slotError } from "./data.js";
import { parseDate, formatTimeInput, addDays, isoDate } from "./schedule.js";
import { confirmedClasses } from "./scheduleReview.js";
import { listTutorAvailability } from "../../../services/tutorAvailability.js";
import { listTutorClassSchedule } from "../../../services/tutorSchedule.js";
import { getSupabaseClient } from "../../../services/supabaseClient.js";
import { topicTimeOptions, groupTopicDates } from "./topicTimeOptions.js";
import { validateTopicService } from "./topicServiceRules.js";
import "./create-service.css";
const newTopic = () => ({
  key: crypto.randomUUID(),
  name: "",
  rate: "",
  types: [],
  meetingLink: "",
  location: "",
  availability: [],
});
const newDate = () => ({
  key: crypto.randomUUID(),
  date: "",
  start: null,
  end: null,
  duration: 1,
  repeat: false,
});

export default function CreateService({
  data,
  saveService,
  onClose,
  service = null,
}) {
  const auth = useAuth();
  const [expertise, setExpertise] = useState([]);
  const [expertiseLoading, setExpertiseLoading] = useState(true);
  const [expertiseError, setExpertiseError] = useState("");
  useEffect(() => {
    let active = true;
    loadMyTutorApplication(auth.user.id)
      .then((application) => {
        if (!active) return;
        const subjects =
          application?.status === "Approved" ? application.subjects : [];
        const fallback = String(data.profile?.expertise || "")
          .split(/[,;\n]/)
          .map((value) => value.trim())
          .filter(Boolean);
        setExpertise([...new Set(subjects.length ? subjects : fallback)]);
      })
      .catch((error) => {
        if (active) setExpertiseError(error.message);
      })
      .finally(() => {
        if (active) setExpertiseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.user.id, data.profile?.expertise]);
  const [name, setName] = useState(service?.name || "");
  const [courseCode, setCourseCode] = useState(
    service?.subtitle !== service?.name ? service?.subtitle || "" : "",
  );
  const [description, setDescription] = useState(service?.description || "");
  const [schedule, setSchedule] = useState({
    slots: data.slots || [],
    classes: confirmedClasses(data),
    bookings: data.sessions || [],
  });
  const [topics, setTopics] = useState(() =>
    service?.topicDetails?.length
      ? service.topicDetails.map((topic) => ({
          ...topic,
          key: crypto.randomUUID(),
          availability: (data.slots || [])
            .filter((slot) => String(slot.topicId) === String(topic.id))
            .flatMap((slot) => {
              const bookings = (schedule.bookings || []).filter(
                (booking) =>
                  ((!booking.service_id && !booking.serviceId) ||
                    String(booking.service_id || booking.serviceId) ===
                      String(service.id)) &&
                  String(booking.date || booking.session_date).slice(0, 10) ===
                    slot.date &&
                  ["pending", "confirmed", "completed"].includes(
                    String(
                      booking.status || booking.booking_status,
                    ).toLowerCase(),
                  ),
              );
              const rows = Array.from(
                { length: Math.ceil((slot.end - slot.start) / 2) },
                (_, i) => ({
                  ...slot,
                  start: slot.start + i * 2,
                  end: Math.min(slot.end, slot.start + i * 2 + 2),
                  duration: Math.min(2, slot.end - slot.start - i * 2),
                  key: crypto.randomUUID(),
                  id: slot.id,
                }),
              );
              for (const booking of bookings) {
                const start =
                  typeof booking.start === "number"
                    ? booking.start
                    : hour(booking.start || booking.start_time);
                const end =
                  typeof booking.end === "number"
                    ? booking.end
                    : hour(booking.end || booking.end_time);
                if (!rows.some((row) => row.start === start)) {
                  rows.push({
                    ...slot,
                    start,
                    end,
                    duration: end - start,
                    key: crypto.randomUUID(),
                    id: slot.id,
                  });
                }
              }
              return rows;
            }),
        }))
      : service
        ? String(service.topics || "")
            .split(",")
            .filter(Boolean)
            .map((name) => ({
              ...newTopic(),
              name: name.trim(),
              rate: service.rate,
              types:
                service.type === "Both"
                  ? ["Online", "In-person"]
                  : [service.type],
              availability: [],
            }))
        : [newTopic()],
  );
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(true),
    [scheduleError, setScheduleError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true,
      inFlight = false;
    setScheduleLoading(true);
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [slots, classes, bookings] = await Promise.all([
          listTutorAvailability(undefined, data.services),
          listTutorClassSchedule(),
          getSupabaseClient().rpc("get_my_tutor_booking_blocks"),
        ]);
        if (bookings.error)
          throw new Error(
            "Could not check booked times. Apply the updated topic_services.sql and retry.",
          );
        if (active) {
          setSchedule({
            slots,
            classes: classes?.classes || [],
            bookings: bookings.data || [],
          });
          setScheduleError("");
        }
      } catch (error) {
        if (active) setScheduleError(error.message);
      } finally {
        inFlight = false;
        if (active) setScheduleLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [refresh]);
  const optionsFor = (row, currentTopics = topics) =>
    topicTimeOptions({
      ...schedule,
      duration: row.duration || row.end - row.start || 1,
      date: row.date,
      repeat: row.repeat,
      rowKey: row.key,
      topics: currentTopics,
      serviceId: service?.id || null,
    });
  const bookingCountFor = (row) =>
    (schedule.bookings || []).filter(
      (booking) =>
        ((!booking.service_id && !booking.serviceId) ||
          String(booking.service_id || booking.serviceId) ===
            String(service?.id || "")) &&
        String(booking.date || booking.session_date || "").slice(0, 10) ===
          row.date &&
        Number(String(booking.start || booking.start_time).slice(0, 2)) +
          Number(String(booking.start || booking.start_time).slice(3, 5)) /
            60 ===
          row.start &&
        ["pending", "confirmed", "completed"].includes(
          String(booking.status || booking.booking_status).toLowerCase(),
        ),
    ).length;
  const isBooked = (row) => bookingCountFor(row) > 0;
  const bookedSlot = (row) =>
    (schedule.bookings || []).find(
      (booking) =>
        ((!booking.service_id && !booking.serviceId) ||
          String(booking.service_id || booking.serviceId) ===
            String(service?.id || "")) &&
        String(booking.date || booking.session_date || "").slice(0, 10) ===
          row.date &&
        Number(String(booking.start || booking.start_time).slice(0, 2)) +
          Number(String(booking.start || booking.start_time).slice(3, 5)) /
            60 ===
          row.start &&
        ["pending", "confirmed", "completed"].includes(
          String(booking.status || booking.booking_status).toLowerCase(),
        ),
    );
  const patch = (key, field, value) => {
    setTopics((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
    setError("");
  };
  const moveDate = (topic, group, date) => {
    const keys = new Set(group.rows.map((row) => row.key));
    const rows = topic.availability.map((row) =>
      keys.has(row.key) ? { ...row, date, start: null, end: null } : row,
    );
    for (const row of rows.filter((row) => keys.has(row.key))) {
      const available = optionsFor(
        row,
        topics.map((value) =>
          value.key === topic.key ? { ...value, availability: rows } : value,
        ),
      );
      row.start = available[0] ?? null;
      row.end = row.start === null ? null : row.start + (row.duration || 1);
    }
    patch(topic.key, "availability", rows);
  };
  const addTime = (topic, group) => {
    const row = { ...newDate(), date: group.date, repeat: group.repeat };
    row.start = optionsFor(row)[0] ?? null;
    if (row.start === null) return;
    row.end = row.start + 1;
    patch(topic.key, "availability", [...topic.availability, row]);
  };
  const patchTime = (topic, key, start) =>
    patch(
      topic.key,
      "availability",
      topic.availability.map((row) =>
        row.key === key
          ? {
              ...row,
              start,
              end: start + (row.duration || row.end - row.start || 1),
            }
          : row,
      ),
    );
  const patchDuration = (topic, key, duration) =>
    patch(
      topic.key,
      "availability",
      topic.availability.map((row) =>
        row.key === key
          ? {
              ...row,
              duration,
              end: row.start === null ? null : row.start + duration,
            }
          : row,
      ),
    );
  const dateError = (row) => {
    const date = parseDate(row.date);
    return slotError(
      { ...row, day: date ? (date.getDay() + 6) % 7 : -1 },
      [],
      schedule.bookings,
      schedule.classes,
    );
  };
  async function submit(e) {
    e.preventDefault();
    if (saving || scheduleLoading || scheduleError || expertiseLoading) return;
    if (expertiseError) return setError(expertiseError);
    if (!courseCode.trim() || courseCode.trim().length > 50)
      return setError("Enter a course code (up to 50 characters).");
    if (!expertise.includes(name))
      return setError("Choose a service title from your subject expertise.");
    for (const topic of topics) {
      if (
        topic.types.includes("In-person") &&
        !topic.availability.some(isBooked)
      ) {
        const location = splitMeetingLocation(topic.location);
        if (!location.place || !location.details.trim())
          return setError(
            "Choose a CSU meeting place and describe the exact location for " +
              (topic.name || "each in-person topic") +
              ".",
          );
      }
    }
    const result = validateTopicService(
      { name, description, topicDetails: topics },
      data.services,
      service?.id ?? null,
    );
    if (result.error) return setError(result.error);
    for (const topic of topics)
      for (const row of topic.availability) {
        const message =
          dateError(row) ||
          (!optionsFor(row).includes(row.start)
            ? "Choose an available start time."
            : "");
        if (message && !isBooked(row))
          return setError(topic.name + ": " + message);
      }
    setSaving(true);
    setError("");
    try {
      await saveService(
        { ...result.values, courseCode: courseCode.trim() },
        service?.id ?? null,
      );
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const repeatLast = (topic) => {
    const group = groupTopicDates(topic.availability).at(-1),
      date = parseDate(group?.date);
    if (!date) return;
    const added = [1, 2, 3, 4].flatMap((week) =>
      group.rows.map((row) => ({
        ...row,
        id: null,
        key: crypto.randomUUID(),
        date: isoDate(addDays(date, week * 7)),
        repeat: false,
      })),
    );
    const combined = [...topic.availability, ...added];
    const current = topics.map((value) =>
      value.key === topic.key ? { ...value, availability: combined } : value,
    );
    if (added.some((row) => !optionsFor(row, current).includes(row.start)))
      return setError(
        "Some repeated times are outside your availability or already occupied. Add those dates separately to choose free times.",
      );
    patch(topic.key, "availability", combined);
  };
  return (
    <Modal
      size="service"
      title={service ? "Edit Service" : "Create New Service"}
      subtitle="One service with separate topics, rates and schedules."
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <button className={button} disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button
            className={primary}
            disabled={saving || scheduleLoading || !!scheduleError}
            type="submit"
            form="create-service-form"
          >
            <Check size={18} />
            {saving ? "Saving..." : service ? "Save Changes" : "Create Service"}
          </button>
        </>
      }
    >
      <form
        id="create-service-form"
        onSubmit={submit}
        className="create-service-form"
      >
        <fieldset disabled={saving} className="service-form-fields">
          <Field label="Course Code">
            <input
              className={input}
              required
              maxLength={50}
              placeholder="e.g. ITE 13"
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
            />
          </Field>
          <Field label="Course Description / Name">
            <select
              className={input}
              required
              value={name}
              disabled={expertiseLoading || !!expertiseError}
              onChange={(event) => setName(event.target.value)}
            >
              <option value="">
                {expertiseLoading
                  ? "Loading your expertise..."
                  : "Choose a subject from your expertise"}
              </option>
              {name && !expertise.includes(name) && (
                <option value={name} disabled>
                  {name} (choose a current expertise)
                </option>
              )}
              {expertise.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            {expertiseError && (
              <p role="alert" className="text-xs text-red-700">
                {expertiseError}
              </p>
            )}
            {!expertiseLoading && !expertiseError && !expertise.length && (
              <p role="alert" className="text-xs text-amber-800">
                Add your subject expertise in Profile before creating a service.
              </p>
            )}
          </Field>
          <Field label="Description">
            <textarea
              className={input}
              required
              maxLength={160}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What learners get from this service"
            />
          </Field>
          <p className="create-service-hint">{description.length}/160</p>
          <div className="service-availability-heading">
            <h3>Topics ({topics.length})</h3>
            <button
              className={button}
              type="button"
              disabled={topics.length >= 20}
              onClick={() => setTopics((rows) => [...rows, newTopic()])}
            >
              <Plus size={15} /> Add Topic
            </button>
          </div>
          {topics.map((topic) => (
            <section className="service-topic-card" key={topic.key}>
              {topic.availability.some(isBooked) && (
                <p className="create-service-hint">
                  This topic has booked sessions. Its details and booked times
                  stay locked; you can still add new times or topics.
                </p>
              )}
              <header>
                <strong>
                  <span className="booking-availability-dot" />{" "}
                  {topic.name || "New topic"}
                </strong>
                <button
                  className={button}
                  type="button"
                  disabled={topic.availability.some(isBooked)}
                  onClick={() =>
                    setTopics((rows) =>
                      rows.filter((row) => row.key !== topic.key),
                    )
                  }
                >
                  <Trash2 size={13} /> Delete topic
                </button>
              </header>
              <div className="service-topic-body">
                <div className="service-topic-settings">
                  <Field label="Topic *">
                    <input
                      className={input}
                      required
                      maxLength={200}
                      value={topic.name}
                      placeholder="e.g., Derivatives"
                      disabled={topic.availability.some(isBooked)}
                      onChange={(e) => patch(topic.key, "name", e.target.value)}
                    />
                  </Field>
                  <Field label="Hourly rate (PHP) *">
                    <input
                      className={
                        input +
                        (Number(topic.rate) > MAX_SERVICE_RATE
                          ? " !border-red-600 !bg-red-50 !text-red-700 ring-1 ring-red-600"
                          : "")
                      }
                      aria-invalid={Number(topic.rate) > MAX_SERVICE_RATE}
                      type="number"
                      required
                      min="1"
                      max={MAX_SERVICE_RATE}
                      step="0.01"
                      value={topic.rate}
                      placeholder="e.g., 150"
                      disabled={topic.availability.some(isBooked)}
                      onChange={(e) => patch(topic.key, "rate", e.target.value)}
                    />
                    {Number(topic.rate) > MAX_SERVICE_RATE && (
                      <p role="alert" className="text-xs text-red-700">
                        Rate must be PHP 250 or below per hour.
                      </p>
                    )}
                  </Field>
                  <fieldset>
                    <legend>Session type *</legend>
                    <div className="service-types">
                      {["Online", "In-person"].map((type) => (
                        <label key={type}>
                          <input
                            type="checkbox"
                            checked={topic.types.includes(type)}
                            disabled={topic.availability.some(isBooked)}
                            onChange={(e) =>
                              patch(
                                topic.key,
                                "types",
                                e.target.checked
                                  ? [...topic.types, type]
                                  : topic.types.filter(
                                      (value) => value !== type,
                                    ),
                              )
                            }
                          />
                          {type === "In-person" ? "In-Person" : type}
                        </label>
                      ))}
                    </div>
                    <p className="create-service-hint">Choose one or both.</p>
                  </fieldset>
                </div>
                <div className="create-service-columns">
                  {topic.types.includes("Online") && (
                    <Field label="Online meeting link *">
                      <input
                        className={input}
                        type="url"
                        required
                        value={topic.meetingLink}
                        maxLength={2000}
                        disabled={topic.availability.some(isBooked)}
                        placeholder="https://meet.google.com/..."
                        onChange={(e) =>
                          patch(topic.key, "meetingLink", e.target.value)
                        }
                      />
                    </Field>
                  )}
                  {topic.types.includes("In-person") && (
                    <div className="space-y-2">
                      <Field label="CSU building / common place *">
                        <select
                          className={input}
                          required
                          value={
                            topic.meetingPlace ??
                            splitMeetingLocation(topic.location).place
                          }
                          disabled={topic.availability.some(isBooked)}
                          onChange={(event) => {
                            const details =
                              topic.locationDetails ??
                              splitMeetingLocation(topic.location).details;
                            patch(
                              topic.key,
                              "meetingPlace",
                              event.target.value,
                            );
                            patch(
                              topic.key,
                              "location",
                              combineMeetingLocation(
                                event.target.value,
                                details,
                              ),
                            );
                          }}
                        >
                          <option value="">Choose a CSU meeting place</option>
                          {CSU_MEETING_PLACES.map((place) => (
                            <option key={place}>{place}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Exact location description *">
                        <textarea
                          className={input}
                          required
                          maxLength={200}
                          placeholder="e.g., second floor, table beside the main entrance"
                          value={
                            topic.locationDetails ??
                            splitMeetingLocation(topic.location).details
                          }
                          disabled={topic.availability.some(isBooked)}
                          onChange={(event) => {
                            const place =
                              topic.meetingPlace ??
                              splitMeetingLocation(topic.location).place;
                            patch(
                              topic.key,
                              "locationDetails",
                              event.target.value,
                            );
                            patch(
                              topic.key,
                              "location",
                              combineMeetingLocation(place, event.target.value),
                            );
                          }}
                        />
                      </Field>
                      <p className="create-service-hint">
                        Describe the floor, room or landmark. Use a public
                        meeting area and check building access.
                      </p>
                    </div>
                  )}
                </div>
                <div className="service-availability-heading">
                  <div>
                    <h3>Dates and times *</h3>
                    <p className="create-service-hint">
                      Each new time slot is 1 hour. Checked against confirmed
                      classes, booked sessions, your other availability and the
                      other topics in this service.
                    </p>
                  </div>
                </div>
                <div className="service-availability">
                  {!topic.availability.length && (
                    <p className="service-topic-empty">
                      No dates and times for this topic.
                    </p>
                  )}
                  {groupTopicDates(topic.availability).map((group) => {
                    const groupBooked = group.rows.some(isBooked);
                    return (
                      <div className="service-date-group" key={group.key}>
                        <div className="service-date-picker">
                          <div className="relative rounded-md focus-within:ring-2 focus-within:ring-green-700">
                            <span
                              className={
                                input +
                                " pointer-events-none block min-h-9 pr-6"
                              }
                            >
                              {formatServiceDate(group.date)}
                            </span>
                            <input
                              type="date"
                              aria-label="Choose session date"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              onClick={(event) =>
                                event.currentTarget.showPicker?.()
                              }
                              required
                              value={group.date}
                              disabled={
                                scheduleLoading ||
                                !!scheduleError ||
                                groupBooked
                              }
                              onChange={(e) =>
                                moveDate(topic, group, e.target.value)
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className="service-remove-date"
                            disabled={groupBooked}
                            onClick={() =>
                              patch(
                                topic.key,
                                "availability",
                                topic.availability.filter(
                                  (row) =>
                                    !group.rows.some(
                                      (item) => item.key === row.key,
                                    ),
                                ),
                              )
                            }
                          >
                            <Trash2 size={12} /> Remove this date
                          </button>
                          {group.repeat && <small>Repeats weekly</small>}
                          {groupBooked && <small>Booked time is locked</small>}
                        </div>
                        <div className="service-date-times">
                          {group.rows.map((row) => {
                            const choices = optionsFor(row),
                              valid = choices.includes(row.start);
                            return (
                              <div className="service-group-time" key={row.key}>
                                <select
                                  className={input}
                                  aria-label={
                                    "Start time on " +
                                    (group.date || "selected date")
                                  }
                                  required
                                  disabled={
                                    !group.date ||
                                    scheduleLoading ||
                                    !!scheduleError ||
                                    isBooked(row) ||
                                    !choices.length
                                  }
                                  value={
                                    valid ? formatTimeInput(row.start) : ""
                                  }
                                  onChange={(e) =>
                                    patchTime(
                                      topic,
                                      row.key,
                                      hour(e.target.value),
                                    )
                                  }
                                >
                                  <option value="" disabled>
                                    {!group.date
                                      ? "Select a date"
                                      : !choices.length
                                        ? "No free times"
                                        : "Choose a free time"}
                                  </option>
                                  {choices.map((start) => (
                                    <option
                                      key={start}
                                      value={formatTimeInput(start)}
                                    >
                                      {time(start)}
                                    </option>
                                  ))}
                                </select>
                                <span className="service-time-end">
                                  {valid
                                    ? "to " + time(row.end)
                                    : "Choose time"}
                                </span>
                                <span
                                  className={
                                    valid
                                      ? "service-slot-valid"
                                      : "create-service-hint"
                                  }
                                >
                                  {valid ? (
                                    <>
                                      <Check size={14} /> No conflicts
                                    </>
                                  ) : group.date ? (
                                    "Choose another free time or date"
                                  ) : (
                                    "Select a date first"
                                  )}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Remove time"
                                  disabled={isBooked(row)}
                                  onClick={() =>
                                    patch(
                                      topic.key,
                                      "availability",
                                      topic.availability.filter(
                                        (item) => item.key !== row.key,
                                      ),
                                    )
                                  }
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className={button}
                            disabled={
                              !group.date ||
                              scheduleLoading ||
                              !!scheduleError ||
                              group.rows.some(isBooked) ||
                              topic.availability.length >= 20 ||
                              !optionsFor({
                                ...newDate(),
                                date: group.date,
                                repeat: group.repeat,
                              }).length
                            }
                            onClick={() => addTime(topic, group)}
                          >
                            <Plus size={14} /> Add time on this date
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="service-availability-actions">
                    <button
                      type="button"
                      className={button}
                      disabled={topic.availability.length >= 20}
                      onClick={() =>
                        patch(topic.key, "availability", [
                          ...topic.availability,
                          newDate(),
                        ])
                      }
                    >
                      <Plus size={14} /> Add date
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={
                        !parseDate(topic.availability.at(-1)?.date) ||
                        topic.availability.length +
                          (groupTopicDates(topic.availability).at(-1)?.rows
                            .length || 0) *
                            4 >
                          20 ||
                        topic.availability.at(-1)?.repeat
                      }
                      onClick={() => repeatLast(topic)}
                    >
                      Repeat last date weekly (4 weeks)
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
          {scheduleLoading && (
            <p role="status">Loading your available times...</p>
          )}
          {scheduleError && (
            <p role="alert" className="service-slot-error">
              {scheduleError}{" "}
              <button
                type="button"
                className={button}
                onClick={() => setRefresh((value) => value + 1)}
              >
                Retry
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className="service-slot-error">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
