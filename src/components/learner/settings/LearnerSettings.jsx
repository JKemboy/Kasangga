import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import {
  Bell,
  CalendarDays,
  CircleDollarSign,
  Database,
  Info,
  Languages,
  MessageCircle,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";
const Toggle = ({ enabled: initial = true, setting = "activity" }) => {
  const work = useLearnerWorkspace();
  const enabled = work.data.settings[setting] ?? initial;
  return (
    <button
      type="button"
      aria-label={`Toggle ${setting}`}
      aria-pressed={enabled}
      onClick={() =>
        work.commit((d) => ({
          ...d,
          settings: { ...d.settings, [setting]: !enabled },
        }))
      }
      className={`relative h-5 w-9 shrink-0 rounded-full ${enabled ? "bg-[#087542]" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${enabled ? "right-0.5" : "left-0.5"}`}
      />
    </button>
  );
};
const Select = ({ icon: Icon, label, value }) => {
  const work = useLearnerWorkspace();
  return (
    <label className="flex gap-2">
      <Icon className="mt-6 h-4 w-4 shrink-0 text-[#405276]" />
      <span className="block min-w-0 flex-1 text-xs font-medium">
        <span>{label}</span>
        <select
          value={work.data.settings[label] || value}
          onChange={(e) =>
            work.commit((d) => ({
              ...d,
              settings: { ...d.settings, [label]: e.target.value },
            }))
          }
          className="mt-1 h-8 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-normal text-[#27344f]"
        >
          {[
            ...new Set([
              value,
              ...(label === "Language"
                ? ["English", "Filipino"]
                : label === "Date Format"
                  ? ["YYYY-MM-DD", "DD/MM/YYYY"]
                  : label === "Profile Visibility"
                    ? ["Registered users only", "Private"]
                    : []),
            ]),
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </span>
    </label>
  );
};
const Notice = ({ icon: Icon, title, text, color }) => (
  <div className="flex items-start gap-2">
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color}`}
    >
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold">{title}</p>
      <p className="mt-1 text-xs leading-4 text-[#566584]">{text}</p>
    </div>
    <Toggle setting={title} />
  </div>
);
export default function LearnerSettings() {
  const work = useLearnerWorkspace();
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Settings
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Manage your account preferences and application settings.
      </p>
      <div className="mt-3 grid items-start gap-2 [&>*]:min-w-0 lg:grid-cols-2">
        <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
          <div className="flex gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff1d6] text-[#f2a400]">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Notifications</h2>
              <p className="mt-1 text-xs text-[#566584]">
                Choose what you want to be notified about.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <Notice
              icon={CalendarDays}
              title="Booking Notifications"
              text="Get notified about booking requests and confirmations."
              color="bg-[#e5f8ec] text-[#087542]"
            />
            <Notice
              icon={Bell}
              title="Session Reminders"
              text="Receive reminders for upcoming sessions."
              color="bg-[#e7f3ff] text-[#1675df]"
            />
            <Notice
              icon={MessageCircle}
              title="Messages"
              text="Get notified about new messages from tutors."
              color="bg-[#e5f8ec] text-[#087542]"
            />
            <Notice
              icon={CircleDollarSign}
              title="Payment Notifications"
              text="Receive updates about payments and transactions."
              color="bg-[#fff1d6] text-[#f2a400]"
            />
            <Notice
              icon={Star}
              title="Review Reminders"
              text="Get reminded to leave reviews for completed sessions."
              color="bg-[#ffebeb] text-[#e65a5a]"
            />
            <Notice
              icon={Info}
              title="System Notifications"
              text="Important updates and announcements from CampusTutor."
              color="bg-[#e7f3ff] text-[#1675df]"
            />
          </div>
        </section>
        <div className="space-y-2">
          <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
            <div className="flex gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7f3ff] text-[#1675df]">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold">Preferences</h2>
                <p className="mt-1 text-xs text-[#566584]">
                  Customize your learning experience.
                </p>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              <Select icon={Languages} label="Language" value="English" />
              <Select
                icon={Info}
                label="Timezone"
                value="(GMT+08:00) Asia/Manila"
              />
              <Select
                icon={CalendarDays}
                label="Date Format"
                value="May 20, 2026 (MMMM DD, YYYY)"
              />
            </div>
          </section>
        </div>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
          <div className="flex gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffebeb] text-red-600">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Data Management</h2>
              <p className="mt-1 text-xs text-[#566584]">
                Manage your data and account information.
              </p>
              <p className="mt-2 text-xs text-[#566584]">
                You can request a copy of your data or delete your account
                permanently.
              </p>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => work.open("data")}
              type="button"
              className="h-8 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
            >
              Request My Data
            </button>
            <button
              onClick={() => work.open("delete")}
              type="button"
              className="flex h-8 items-center justify-center gap-2 rounded-md border border-red-500 text-xs font-semibold text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </div>
        </section>
        <section className="flex gap-2 rounded-xl bg-[#e9f6ff] p-3">
          <Info className="h-5 w-5 shrink-0 text-[#1675df]" />
          <div>
            <h2 className="text-xs font-bold">Security Reminder</h2>
            <p className="mt-2 text-xs leading-4 text-[#566584]">
              Keep your account secure. Never share your email verification
              codes. Protect your CSU Google account. If you notice any
              suspicious activity, please contact the CampusTutor support team
              immediately.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
