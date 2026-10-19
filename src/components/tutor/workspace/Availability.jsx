// Availability & Schedule: combines the tutor class schedule and open tutoring slots, using callbacks for Supabase persistence.
import AvailabilityEditor from "./AvailabilityEditor.jsx";
import AvailabilityPopover from "./AvailabilityPopover.jsx";
import SessionDetails from "./SessionDetails.jsx";
import "./availability-interactions.css";
import { confirmedClasses } from "./scheduleReview.js";
import { useInteractions } from "../../shared/InteractionProvider.jsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  eventsForDate,
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
const swatches = {
  class: "bg-rose-400",
  available: "bg-green-400",
  session: "bg-blue-400",
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

export default function Availability({
  data,
  scheduleRequired = false,
  update,
  go,
  args = {},
  availabilityLoading,
  availabilityError,
  refreshAvailability,
  saveAvailability,
  removeAvailability,
  classScheduleLoading,
  classScheduleError,
  refreshClassSchedule,
  saveClassSchedule,
}) {
  const [tab, setTab] = useState(
    !scheduleRequired && tabs.includes(args.tab) ? args.tab : tabs[0],
  );
  const [anchor, setAnchor] = useState(
    () => parseDate(args.date) || todayInManila(),
  );
  const [mode, setMode] = useState("Week");
  const [edit, setEdit] = useState(null);
  const [upload, setUpload] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [day, setDay] = useState(null);
  useEffect(() => {
    if (scheduleRequired) {
      setTab(tabs[0]);
      setEdit(null);
      setSelected(null);
      setDay(null);
    }
  }, [scheduleRequired]);
  const [calendarHeight, setCalendarHeight] = useState(380);
  const calendarRef = useRef(null);
  const classOnly = tab === "Class Schedule";
  const classes = confirmedClasses(data);

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
      kind: "available",
      serviceId: null,
    };
    for (let start = 7; start <= 20; start += 0.5) {
      candidate.start = start;
      candidate.end = start + 1;
      if (
        !slotError(candidate, data.slots, data.sessions, confirmedClasses(data))
      )
        break;
    }
    setError("");
    setDay(null);
    setEdit(candidate);
  }

  function openEvent(event, date, rect) {
    setDay(null);
    setError("");
    if (event.kind === "session") {
      setSelected(null);
      setSessionId(event.sessionId);
    } else setSelected({ event, date, rect });
  }
  const { confirm } = useInteractions();
  async function deleteSlot(slot) {
    setSelected(null);
    if (
      !(await confirm({
        title: "Remove this availability?",
        message: slot.repeat
          ? "Remove this weekly block? Existing booked sessions stay scheduled."
          : "Learners can no longer book this time. Existing booked sessions stay scheduled.",
        accept: "Remove Availability",
        danger: true,
      }))
    )
      return;
    if (!slot.id) {
      setError("This availability slot is not saved in the database.");
      return;
    }
    try {
      await removeAvailability(slot);
      closeEdit();
    } catch (removeError) {
      setError(removeError.message || "Could not remove this block.");
    }
  }
  const classConflicts = data.slots.filter(
    (s) =>
      (!s.kind || s.kind === "available") &&
      confirmedClasses(data).some(
        (c) => c[0] === s.day && s.start < c[2] && c[1] < s.end,
      ),
  );
  function showConflict() {
    const slot = classConflicts[0];
    if (!slot) return;
    let date = parseDate(slot.date);
    if (slot.repeat) {
      date = addDays(weekStart(anchor), slot.day);
    }
    setAnchor(date);
    setMode("Week");
    const event = eventsForDate(date, {
      classes: confirmedClasses(data),
      slots: data.slots,
      sessions: data.sessions,
    }).find((e) => e.slot?.id === slot.id);
    if (event) setSelected({ event, date });
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
      {availabilityLoading && (
        <p role="status" className="rounded border bg-white p-2">
          Loading tutoring availability from Supabase...
        </p>
      )}
      {availabilityError && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-2 text-red-700"
        >
          {availabilityError}{" "}
          <button
            type="button"
            className="underline"
            onClick={refreshAvailability}
          >
            Retry
          </button>
        </p>
      )}

      <div
        role="tablist"
        aria-label="Schedule tabs"
        className="flex border-b border-[#e0e7f0]"
      >
        {tabs.map((name, index) => (
          <button
            key={name}
            type="button"
            disabled={scheduleRequired && name !== "Class Schedule"}
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
                if (scheduleRequired && next !== 0) return;
                setTab(tabs[next]);
                document.getElementById(`schedule-tab-${next}`).focus();
              }
            }}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-t-md border border-b-2 px-3 py-2 text-xs font-medium sm:min-w-44 sm:px-5 ${tab === name ? "border-green-800 border-b-amber-400 bg-green-800 text-white" : "border-[#e0e7f0] bg-white text-[#23356b] hover:bg-green-50"}`}
            onClick={() => {
              setSelected(null);
              setTab(name);
            }}
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e0e7f0] bg-white p-3">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck
                  className="h-9 w-9 shrink-0 fill-green-800 text-white"
                  strokeWidth={1.5}
                />
                <div>
                  <h2 className="text-xs font-bold">Class Schedule</h2>
                  {data.classSchedule && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#dff3e5] px-2 py-0.5 text-[10px] text-green-900">
                      <Check className="h-3 w-3" />
                      Confirmed · Read-Only
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={`${primary} inline-flex items-center justify-center gap-2 py-2`}
                onClick={() => setUpload(true)}
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>
                  {data.scheduleReview
                    ? "Continue Schedule Review"
                    : "Upload Updated Class Schedule"}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-[#eaf4ff] px-3 py-2 text-[11px] leading-4 text-[#00257a]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p>
                  Confirmed class times block tutoring availability. To make
                  changes, upload your updated class schedule.
                </p>
                <p className="mt-1 text-[#455780]">
                  Your current schedule remains active until the updated
                  schedule is reviewed and confirmed.
                </p>
              </div>
            </div>
            {classScheduleLoading && (
              <p role="status" className="text-sm text-[#455780]">
                Loading confirmed class schedule...
              </p>
            )}
            {classScheduleError && (
              <p role="alert" className="text-sm text-red-700">
                {classScheduleError}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={refreshClassSchedule}
                >
                  Retry
                </button>
              </p>
            )}
            {!classScheduleLoading &&
              !classScheduleError &&
              !classes.length && (
                <p className="rounded-lg border border-dashed border-[#cbd5e1] bg-white p-4 text-sm text-[#455780]">
                  No confirmed class schedule yet. Upload your Certificate of
                  Registration to add classes.
                </p>
              )}
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
                  disabled={availabilityLoading || !!availabilityError}
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

        {!classOnly && !!classConflicts.length && (
          <div className="availability-conflict-banner">
            <div>
              <strong>
                {classConflicts.length} availability blocks overlap your class
                schedule
              </strong>
              <p>
                These times cannot be booked. Update or remove the striped
                blocks.
              </p>
            </div>
            <button className={button} onClick={showConflict}>
              Show first conflict
            </button>
          </div>
        )}
        <div
          aria-label="Calendar legend"
          className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[10px] text-[#344675]"
        >
          {(classOnly
            ? [["class", "Confirmed Class"]]
            : [
                ["class", "Class Schedule — Blocked"],
                ["available", "Available for Tutoring"],
                ["session", "Confirmed Tutoring Session — Occupied"],
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
        <AvailabilityEditor
          slot={edit}
          data={data}
          saveAvailability={saveAvailability}
          onClose={closeEdit}
          onSaved={(date) => {
            setAnchor(date);
            closeEdit();
          }}
          onDelete={deleteSlot}
        />
      )}
      {selected && (
        <AvailabilityPopover
          selection={selected}
          onClose={() => setSelected(null)}
          onEdit={(slot, date) => {
            setEdit({ ...slot, date: isoDate(date) });
            setSelected(null);
          }}
          onDelete={deleteSlot}
        />
      )}
      {sessionId && (
        <SessionDetails
          data={data}
          update={update}
          go={go}
          sessionId={sessionId}
          onClose={() => setSessionId(null)}
        />
      )}
      {error && !edit && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
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
                  disabled={availabilityLoading || !!availabilityError}
                  onClick={() => addAvailability(day.date)}
                >
                  Add Availability
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      <ScheduleUpload
        data={data}
        saveClassSchedule={saveClassSchedule}
        visible={upload}
        onClose={() => setUpload(false)}
        onReviewAvailability={() => {
          setUpload(false);
          setTab("Tutoring Availability");
        }}
      />
    </section>
  );
}
