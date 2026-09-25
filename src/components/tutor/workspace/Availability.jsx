import { useInteractions } from "../../shared/InteractionProvider.jsx";
import { useLayoutEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { hour, time, slotError } from "./data.js";
import { Modal, Field, button, primary, input } from "./ui.jsx";
import {
  addDays,
  formatTimeInput,
  isoDate,
  parseDate,
  shiftMonth,
  weekStart,
} from "./schedule.js";
import ScheduleCalendar from "./ScheduleCalendar.jsx";
import ScheduleUpload from "./ScheduleUpload.jsx";

const tabs = ["Class Schedule", "Tutoring Availability"];
const todayInManila = () =>
  parseDate(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
const fullDate = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const eventLabels = {
  class: "Confirmed class",
  available: "Available for tutoring",
  session: "Confirmed tutoring session",
  protected: "Protected time",
};
const swatches = {
  class: "bg-rose-400",
  available: "bg-green-400",
  session: "bg-blue-400",
  protected: "bg-slate-400",
};

function rangeLabel(anchor, mode) {
  if (mode === "Month")
    return anchor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  const first = weekStart(anchor),
    last = addDays(first, 6);
  const options = { month: "long", day: "numeric", year: "numeric" };
  if (first.getFullYear() !== last.getFullYear())
    return `${first.toLocaleDateString("en-US", options)} – ${last.toLocaleDateString("en-US", options)}`;
  if (first.getMonth() !== last.getMonth())
    return `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", options)}`;
  return `${first.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${last.getDate()}, ${last.getFullYear()}`;
}

export default function Availability({ data, update, go, args = {} }) {
  const [tab, setTab] = useState(tabs.includes(args.tab) ? args.tab : tabs[0]);
  const [anchor, setAnchor] = useState(
    () => parseDate(args.date) || new Date(2026, 8, 14, 12),
  );
  const [mode, setMode] = useState("Week");
  const [edit, setEdit] = useState(null);
  const [upload, setUpload] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [day, setDay] = useState(null);
  const [calendarHeight, setCalendarHeight] = useState(380);
  const calendarRef = useRef(null);
  const classOnly = tab === "Class Schedule";
  const lastUpload = data.uploads.at(-1);

  useLayoutEffect(() => {
    const measure = () => {
      const top = calendarRef.current.getBoundingClientRect().top;
      setCalendarHeight(
        window.innerWidth >= 1024
          ? Math.max(180, window.innerHeight - top - 12)
          : 500,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(
      calendarRef.current.closest("main")?.firstElementChild ||
        calendarRef.current.parentElement,
    );
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tab, mode]);

  function closeEdit() {
    setEdit(null);
    setError("");
  }

  function addAvailability(date = anchor) {
    const candidate = {
      date: isoDate(date),
      day: (date.getDay() + 6) % 7,
      start: 7,
      end: 8,
      repeat: true,
      type: "Online",
    };
    for (let start = 7; start <= 20; start += 0.5) {
      candidate.start = start;
      candidate.end = start + 1;
      if (!slotError(candidate, data.slots, data.sessions)) break;
    }
    setError("");
    setDay(null);
    setEdit(candidate);
  }

  function openEvent(event, date) {
    setDay(null);
    setError("");
    if (event.kind === "available")
      setEdit({ ...event.slot, date: isoDate(date) });
    else setSelected({ event, date });
  }

  function save(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const date = parseDate(fields.date);
    if (!date) return setError("Choose a valid date.");
    if (edit.id && !data.slots.some((slot) => slot.id === edit.id))
      return setError(
        "This availability no longer exists. Close the form and try again.",
      );
    const slot = {
      id: edit.id || crypto.randomUUID(),
      date: fields.date,
      day: (date.getDay() + 6) % 7,
      start: hour(fields.start),
      end: hour(fields.end),
      repeat: fields.repeat === "on",
      type: fields.type,
    };
    const validation = slotError(slot, data.slots, data.sessions);
    if (validation) return setError(validation);
    const saved = update((d) => ({
      ...d,
      slots: edit.id
        ? d.slots.map((s) => (s.id === edit.id ? slot : s))
        : [...d.slots, slot],
    }));
    if (saved === false)
      return setError(
        "Could not save availability. Please try again when browser storage is available.",
      );
    setAnchor(date);
    closeEdit();
  }

  const {confirm} = useInteractions();
  async function deleteSlot() {
    if (!await confirm({title:"Remove this availability?",message:"Learners can no longer book this time. Existing booked sessions are not affected.",accept:"Remove Availability",danger:true})) return;
    const saved = update((d) => ({
      ...d,
      slots: d.slots.filter((s) => s.id !== edit.id),
    }));
    if (saved === false)
      return setError("Could not delete this slot. Please try again.");
    closeEdit();
  }

  return (
    <section
      aria-labelledby="availability-heading"
      className="space-y-2 text-xs text-[#101828]"
    >
      <div>
        <h1
          id="availability-heading"
          className="text-2xl font-bold tracking-tight"
        >
          Availability &amp; Schedule
        </h1>
        <p className="mt-0.5 text-xs text-[#23356b]">
          Manage your confirmed class schedule and valid tutoring availability.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Schedule tabs"
        className="flex border-b border-[#e0e7f0]"
      >
        {tabs.map((name, index) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`schedule-tab-${index}`}
            aria-controls="schedule-panel"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - index;
                setTab(tabs[next]);
                document.getElementById(`schedule-tab-${next}`).focus();
              }
            }}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-t-md border border-b-2 px-3 py-2 text-xs font-medium sm:min-w-44 sm:px-5 ${tab === name ? "border-green-800 border-b-amber-400 bg-green-800 text-white" : "border-[#e0e7f0] bg-white text-[#23356b] hover:bg-green-50"}`}
            onClick={() => setTab(name)}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            {name}
          </button>
        ))}
      </div>

      <div
        id="schedule-panel"
        role="tabpanel"
        aria-labelledby={`schedule-tab-${tabs.indexOf(tab)}`}
        className="space-y-2"
      >
        {classOnly ? (
          <>
            <div className="grid items-center gap-3 rounded-lg border border-[#e0e7f0] bg-white p-3 sm:grid-cols-3 lg:grid-cols-[1.4fr_.75fr_.75fr_1fr_auto]">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck
                  className="h-9 w-9 shrink-0 fill-green-800 text-white"
                  strokeWidth={1.5}
                />
                <div>
                  <h2 className="text-xs font-bold">
                    Class Schedule Confirmed
                  </h2>
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#dff3e5] px-2 py-0.5 text-[10px] text-green-900">
                    <Check className="h-3 w-3" />
                    Confirmed · Read-Only
                  </span>
                </div>
              </div>
              {[
                ["Academic Year", "2026 – 2027"],
                ["Semester", "First Semester"],
                ["Last Updated", "September 10, 2026"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 lg:border-l lg:border-[#e0e7f0] lg:pl-3"
                >
                  <p className="text-[10px] text-[#455780]">{label}</p>
                  <p className="mt-1 text-[11px] font-medium">{value}</p>
                </div>
              ))}
              <button
                type="button"
                className={`${primary} inline-flex items-center justify-center gap-2 py-2`}
                onClick={() => setUpload(true)}
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>Upload Updated Class Schedule</span>
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-[#eaf4ff] px-3 py-2 text-[11px] leading-4 text-[#00257a]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p>
                  Your confirmed class schedule is read-only and is used to
                  prevent tutoring schedule conflicts. To make changes, upload
                  your updated class schedule.
                </p>
                <p className="mt-1 text-[#455780]">
                  Your existing schedule remains active until the updated
                  schedule has been processed, reviewed, and confirmed.
                </p>
                {lastUpload && (
                  <button
                    type="button"
                    className="mt-1 max-w-full break-words text-left font-medium underline underline-offset-2"
                    onClick={() => setUpload(true)}
                  >
                    Latest draft: {lastUpload.name} · Saved on this browser
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e0e7f0] bg-white p-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Previous ${mode.toLowerCase()}`}
                  className={`${button} inline-flex items-center gap-1 border-[#dce4ef] text-[#23356b]`}
                  onClick={() =>
                    setAnchor(
                      mode === "Month"
                        ? shiftMonth(anchor, -1)
                        : addDays(anchor, -7),
                    )
                  }
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  className={`${button} border-[#dce4ef] text-[#23356b]`}
                  onClick={() => setAnchor(todayInManila())}
                >
                  Today
                </button>
                <button
                  type="button"
                  aria-label={`Next ${mode.toLowerCase()}`}
                  className={`${button} inline-flex items-center gap-1 border-[#dce4ef] text-[#23356b]`}
                  onClick={() =>
                    setAnchor(
                      mode === "Month"
                        ? shiftMonth(anchor, 1)
                        : addDays(anchor, 7),
                    )
                  }
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <h2
                aria-live="polite"
                className="order-first w-full text-center text-base font-bold sm:order-none sm:w-auto"
              >
                {rangeLabel(anchor, mode)}
              </h2>
              <div className="flex items-center gap-2">
                <div
                  role="group"
                  aria-label="Calendar view"
                  className="flex rounded-md border border-[#dce4ef] bg-white p-0.5"
                >
                  {["Week", "Month"].map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={mode === name}
                      className={`rounded px-3 py-1.5 text-[11px] font-medium ${mode === name ? "bg-green-800 text-white" : "text-[#23356b] hover:bg-green-50"}`}
                      onClick={() => setMode(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${primary} inline-flex items-center gap-1.5 py-2`}
                  onClick={() => addAvailability()}
                >
                  <Plus className="h-4 w-4" />
                  Add Availability
                </button>
              </div>
            </div>
            <p className="flex items-center gap-3 rounded-md border border-blue-100 bg-[#eaf4ff] px-3 py-2 text-[11px] leading-4 text-[#00257a]">
              <LockKeyhole className="h-4 w-4 shrink-0 text-blue-600" />
              Availability is automatically checked against your confirmed class
              schedule and existing confirmed tutoring sessions.
            </p>
          </>
        )}

        <div
          aria-label="Calendar legend"
          className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[10px] text-[#344675]"
        >
          {(classOnly
            ? [
                ["class", "Confirmed Class"],
                ["protected", "Protected Time"],
              ]
            : [
                ["class", "Class Schedule — Blocked"],
                ["available", "Available for Tutoring"],
                ["session", "Confirmed Tutoring Session — Occupied"],
                ["protected", "Unavailable"],
              ]
          ).map(([kind, label]) => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${swatches[kind]}`} />
              {label}
            </span>
          ))}
        </div>
        <div ref={calendarRef} className="min-w-0">
          <ScheduleCalendar
            anchor={anchor}
            mode={classOnly ? "Week" : mode}
            classOnly={classOnly}
            data={data}
            height={calendarHeight}
            onEvent={openEvent}
            onDay={(date, events) => setDay({ date, events })}
          />
        </div>
      </div>

      {edit && (
        <Modal
          title={edit.id ? "Edit Availability" : "Add Availability"}
          onClose={closeEdit}
        >
          <form onSubmit={save} className="space-y-3 p-1">
            <Field
              label="Date"
              name="date"
              type="date"
              required
              defaultValue={edit.date}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Start Time"
                name="start"
                type="time"
                min="07:00"
                max="20:59"
                step="60"
                required
                defaultValue={formatTimeInput(edit.start)}
              />
              <Field
                label="End Time"
                name="end"
                type="time"
                min="07:01"
                max="21:00"
                step="60"
                required
                defaultValue={formatTimeInput(edit.end)}
              />
            </div>
            <Field label="Session Type">
              <select
                name="type"
                className={input}
                defaultValue={edit.type || "Online"}
              >
                {["Online", "In-person", "Both"].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs">
              <input
                name="repeat"
                type="checkbox"
                defaultChecked={edit.repeat ?? true}
                className="accent-green-800"
              />
              Repeat weekly on this day
            </label>
            {edit.id && edit.repeat && (
              <p className="text-[11px] leading-5 text-[#455780]">
                Editing or deleting this slot updates its weekly availability.
              </p>
            )}
            <p className="text-[11px] text-[#455780]">
              Times use Asia/Manila (GMT+08:00). Available hours: 7:00 AM–9:00
              PM.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded bg-red-50 p-2 text-xs text-red-700"
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {edit.id && (
                <button
                  type="button"
                  className="mr-auto inline-flex items-center gap-1.5 rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  onClick={deleteSlot}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Slot
                </button>
              )}
              <button type="button" className={button} onClick={closeEdit}>
                Cancel
              </button>
              <button className={primary}>Save Availability</button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal title={selected.event.title} onClose={() => setSelected(null)}>
          <div className="space-y-3 p-1 text-sm">
            <p className="flex items-center gap-2 text-xs text-[#455780]">
              <LockKeyhole className="h-4 w-4" />
              {eventLabels[selected.event.kind]} · Read-only
            </p>
            <p className="font-medium">{fullDate(selected.date)}</p>
            <p>
              {time(selected.event.start)} – {time(selected.event.end)}
            </p>
            {selected.event.detail && (
              <p className="break-words leading-6">{selected.event.detail}</p>
            )}
            {selected.event.room && <p>{selected.event.room}</p>}
            {selected.event.kind === "protected" && (
              <p className="text-xs text-[#455780]">
                This protected time is unavailable for tutoring.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                onClick={() => setSelected(null)}
              >
                Close
              </button>
              {selected.event.kind === "session" &&
                selected.event.sessionId && (
                  <button
                    type="button"
                    className={primary}
                    onClick={() =>
                      go("sessions", {
                        sessionId: selected.event.sessionId,
                      })
                    }
                  >
                    View Session
                  </button>
                )}
            </div>
          </div>
        </Modal>
      )}

      {day && (
        <Modal title={fullDate(day.date)} onClose={() => setDay(null)}>
          <div className="space-y-2 p-1">
            {day.events.length ? (
              day.events.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  className="flex w-full items-start gap-2 rounded border border-slate-200 p-2 text-left text-xs hover:bg-slate-50"
                  onClick={() => openEvent(event, day.date)}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${swatches[event.kind]}`}
                  />
                  <span>
                    <b>{event.title}</b>
                    <span className="mt-1 block text-[#455780]">
                      {time(event.start)} – {time(event.end)}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="py-3 text-xs text-[#455780]">
                No scheduled events for this day.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={button}
                onClick={() => setDay(null)}
              >
                Close
              </button>
              {!classOnly && (
                <button
                  type="button"
                  className={primary}
                  onClick={() => addAvailability(day.date)}
                >
                  Add Availability
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {upload && (
        <ScheduleUpload
          data={data}
          update={update}
          onClose={() => setUpload(false)}
        />
      )}
    </section>
  );
}
