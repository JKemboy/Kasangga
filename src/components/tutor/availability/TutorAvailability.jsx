import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Monitor,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const colors = {
  Available: "border-green-400 bg-[#e5f3e8] text-green-800",
  Booked: "border-blue-400 bg-blue-50 text-blue-600",
  Unavailable: "border-gray-400 bg-gray-100 text-gray-600",
  "Class Conflict": "border-red-400 bg-red-50 text-red-600",
};
const initialSlots = [
  [0, 8, 10, "Available", "Online"],
  [0, 11, 12, "Booked", "John M."],
  [0, 14, 16, "Class Conflict", "Data Structures"],
  [0, 18, 20, "Available", "Online"],
  [1, 9, 11, "Available", "Online"],
  [1, 13, 14.5, "Booked", "Maria A."],
  [1, 15, 17, "Class Conflict", "IT Elective"],
  [1, 19, 21, "Available", "In-person"],
  [2, 8, 10, "Unavailable", ""],
  [2, 11, 12, "Booked", "Mark J."],
  [2, 16, 18, "Available", "Online"],
  [2, 19, 21, "Available", "Online"],
  [3, 9, 11, "Available", "Online"],
  [3, 14, 16, "Booked", "Rianne K."],
  [3, 18, 20, "Available", "In-person"],
  [4, 8, 10, "Unavailable", ""],
  [4, 13, 14, "Booked", "Allen E."],
  [4, 15, 17, "Available", "Online"],
  [4, 19, 21, "Available", "Online"],
  [5, 10, 12, "Available", "Online"],
  [5, 13, 15, "Available", "In-person"],
  [5, 16, 18, "Available", "Online"],
  [5, 19, 21, "Available", "Online"],
  [6, 10, 12, "Available", "Online"],
  [6, 13, 15, "Available", "Online"],
  [6, 16, 18, "Available", "Online"],
  [6, 19, 21, "Available", "Online"],
];
const button =
  "h-9 rounded-md border border-[#dfe5ed] bg-white px-3 text-[11px] font-semibold";
const field =
  "mt-2 h-9 w-full rounded-md border border-[#dfe5ed] bg-white px-2 text-[10px]";
const time = (hour) =>
  `${Math.floor(hour) % 12 || 12}:${hour % 1 ? "30" : "00"} ${hour >= 12 ? "PM" : "AM"}`;
function Toggle({ label, enabled = false }) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={enabled}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="h-4 w-7 rounded-full bg-slate-300 peer-checked:bg-green-700 peer-focus-visible:ring-2 peer-focus-visible:ring-green-600" />
      <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform peer-checked:translate-x-3" />
    </label>
  );
}
export default function TutorAvailability() {
  const [adding, setAdding] = useState(true);
  const [notice, setNotice] = useState("");
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
          <p className="mt-2 text-xs text-[#253455]">
            Set your available time slots for tutoring sessions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${button} flex items-center gap-2 border-green-200`}
          >
            <RefreshCw className="h-3.5 w-3.5 text-green-800" />
            Recurring Weekly Schedule
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${button} flex items-center gap-2 border-green-800 bg-green-800 text-white`}
          >
            <Plus className="h-4 w-4" />
            Add Availability
          </button>
        </div>
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <div className="flex items-center rounded-md border border-[#dfe5ed] bg-white">
                <button
                  type="button"
                  aria-label="Previous week"
                  className="p-2"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px]">May 12 – May 18, 2025</span>
                <button type="button" aria-label="Next week" className="p-2">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button type="button" className={button}>
                Today
              </button>
            </div>
            <select aria-label="Filter session type" className={button}>
              <option>Session Type: All</option>
            </select>
          </div>
          <div className="mb-2 flex flex-wrap justify-end gap-3">
            {Object.entries(colors).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1 text-[8px]">
                <span className={`h-2 w-2 rounded-sm border-l-2 ${color}`} />
                {label}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#e4e8ef] bg-white">
            <div className="min-w-[690px]">
              <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-slate-100">
                <div />
                {days.map((day, index) => (
                  <div
                    key={day}
                    className="border-l border-slate-100 py-2 text-center"
                  >
                    <p className="text-[10px] font-semibold">
                      {day.slice(0, 3)}
                    </p>
                    <p className="mt-1 text-[8px] text-[#45516e]">
                      May {12 + index}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid h-[510px] grid-cols-[48px_repeat(7,minmax(0,1fr))]">
                <div className="relative">
                  {Array.from({ length: 15 }, (_, i) => (
                    <span
                      key={i}
                      className="absolute left-2 text-[8px] text-[#66718f]"
                      style={{ top: `${(i / 15) * 100}%` }}
                    >
                      {time(i + 7)}
                    </span>
                  ))}
                </div>
                {days.map((day, index) => (
                  <div
                    key={day}
                    className="relative border-l border-slate-100 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(6.6667%-1px),#f8fafb_calc(6.6667%-1px),#f8fafb_6.6667%)]"
                  >
                    {initialSlots
                      .filter((slot) => slot[0] === index)
                      .map(([, start, end, status, detail]) => (
                        <div
                          key={start}
                          className={`absolute inset-x-2 overflow-hidden rounded border-l-2 px-1.5 py-1 ${colors[status]}`}
                          style={{
                            top: `${((start - 7) / 15) * 100}%`,
                            height: `${((end - start) / 15) * 100}%`,
                          }}
                        >
                          <p className="text-[7px] font-semibold">
                            {time(start)} - {time(end)}
                          </p>
                          <p className="mt-0.5 text-[9px] font-semibold">
                            {status}
                          </p>
                          {detail && (
                            <p className="mt-0.5 flex items-center gap-0.5 text-[8px]">
                              {status === "Available" &&
                                (detail === "Online" ? (
                                  <Monitor className="h-2.5 w-2.5" />
                                ) : (
                                  <MapPin className="h-2.5 w-2.5" />
                                ))}
                              {detail}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-[10px] text-blue-900">
            <Info className="h-4 w-4 shrink-0 text-blue-600" />
            Conflict Notice: Time slots that overlap with your class schedule
            are marked as Class Conflict and cannot be set as available.
          </p>
        </div>
        <aside className="space-y-3">
          <section className="rounded-lg border border-[#e4e8ef] bg-white p-4">
            <h2 className="text-sm font-semibold">Availability Settings</h2>
            <label className="mt-4 block text-[10px] text-[#66718f]">
              Session Type Preference
              <span className="mt-1 block leading-4">
                Choose the default session type for new availability.
              </span>
              <select className={field}>
                <option>Both Online &amp; In-person</option>
                <option>Online</option>
                <option>In-person</option>
              </select>
            </label>
            <label className="mt-4 block text-[10px] text-[#66718f]">
              Minimum Notice
              <span className="mt-1 block">
                Minimum hours before a booking can be made.
              </span>
              <select defaultValue="2 hours" className={field}>
                <option>1 hour</option>
                <option>2 hours</option>
                <option>24 hours</option>
              </select>
            </label>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[10px] text-[#66718f]">
                <p>Auto-accept Bookings</p>
                <p className="mt-1">
                  Automatically accept new booking requests.
                </p>
              </div>
              <Toggle label="Auto-accept Bookings" />
            </div>
          </section>
          <section className="rounded-lg border border-[#e4e8ef] bg-white p-4">
            <h2 className="text-sm font-semibold">Legend</h2>
            <dl className="mt-4 space-y-4">
              {[
                ["Available", "You are open for bookings."],
                ["Booked", "You have a confirmed session."],
                ["Unavailable", "You are not available."],
                ["Class Conflict", "Conflicts with your class schedule."],
              ].map(([label, description]) => (
                <div key={label}>
                  <dt className="flex items-center gap-2 text-[10px]">
                    <span
                      className={`h-3 w-1.5 rounded-sm border-l-2 ${colors[label]}`}
                    />
                    {label}
                  </dt>
                  <dd className="ml-3.5 mt-1 text-[9px] text-[#66718f]">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          {adding && (
            <section
              aria-label="Add Availability"
              className="relative z-10 rounded-lg border border-[#e4e8ef] bg-white p-3 shadow-lg 2xl:-ml-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Add Availability</h2>
                <button
                  type="button"
                  aria-label="Close availability form"
                  onClick={() => setAdding(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setNotice(
                    "Availability has not been saved. Scheduling is not connected yet.",
                  );
                }}
                className="mt-4 space-y-3"
              >
                <label className="block text-[9px] text-[#66718f]">
                  Day
                  <select className={field}>
                    {days.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[9px] text-[#66718f]">
                    Start Time
                    <input
                      type="time"
                      defaultValue="14:00"
                      required
                      className={field}
                    />
                  </label>
                  <label className="text-[9px] text-[#66718f]">
                    End Time
                    <input
                      type="time"
                      defaultValue="16:00"
                      required
                      className={field}
                    />
                  </label>
                </div>
                <label className="block text-[9px] text-[#66718f]">
                  Session Type
                  <select className={field}>
                    <option>Online</option>
                    <option>In-person</option>
                  </select>
                </label>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold">Repeat Weekly</p>
                    <p className="mt-1 text-[9px] text-[#66718f]">
                      Apply this time slot every week.
                    </p>
                  </div>
                  <Toggle label="Repeat Weekly" enabled />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className={button}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`${button} border-green-800 bg-green-800 text-white`}
                  >
                    Save
                  </button>
                </div>
              </form>
            </section>
          )}
          <button
            type="button"
            onClick={() =>
              setNotice(
                "Changes have not been saved. Scheduling is not connected yet.",
              )
            }
            className={`${button} float-right border-green-800 bg-green-800 text-white`}
          >
            Save Changes
          </button>
          {notice && (
            <p role="status" className="clear-both pt-2 text-xs text-[#66718f]">
              {notice}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
