import {
  Bell,
  CalendarCheck,
  Check,
  Clock3,
  Globe,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  UserRoundCheck,
  Wallet,
} from "lucide-react";

function Toggle({ label, enabled = true }) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        aria-label={label}
        defaultChecked={enabled}
        className="peer sr-only"
      />
      <span className="h-5 w-9 rounded-full bg-[#c9ced8] transition-colors peer-checked:bg-[#08751d] peer-focus-visible:ring-2 peer-focus-visible:ring-green-600 peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
    </label>
  );
}
function Panel({ icon: Icon, title, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-[#e3e8ef] bg-white p-4 lg:p-5 ${className}`}
    >
      <h2 className="mb-6 flex items-center gap-3 text-sm font-semibold text-[#101828]">
        <span className="rounded-md bg-[#f1f9f1] p-1 text-[#086619]">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
const fieldClass =
  "mt-2 h-10 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-medium text-[#101828] outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/10";
function Select({ label, options, value }) {
  return (
    <label className="block text-xs font-semibold text-[#101828]">
      {label}
      <select defaultValue={value} className={fieldClass}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
export default function TutorSettings() {
  return (
    <section className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
            Settings
          </h1>
          <p className="mt-2 text-xs font-medium text-[#15213f]">
            Manage your account, preferences, and notification settings.
          </p>
        </div>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-md bg-[#086b18] px-4 text-xs font-semibold text-white hover:bg-[#075915]"
        >
          <Check className="h-4 w-4" />
          Save Changes
        </button>
      </div>
      <div className="mt-7 grid items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1.05fr_1.13fr]">
        <Panel icon={UserRound} title="Account" className="xl:min-h-[290px]">
          <label className="block text-xs font-semibold text-[#101828]">
            Email Address
            <input
              type="email"
              defaultValue="juan.delacruz@csu.edu.ph"
              className={fieldClass}
            />
          </label>
          <div className="mt-6">
            <p className="text-xs font-semibold text-[#101828]">Password</p>
            <div className="mt-2 flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-md border border-[#dfe5ed] p-1 pl-3">
              <span
                aria-label="Password hidden"
                className="text-xs tracking-wider"
              >
                ••••••••••••
              </span>
              <button
                type="button"
                className="h-8 rounded border border-[#77ad80] px-3 text-[11px] font-semibold text-[#086619]"
              >
                Change Password
              </button>
            </div>
          </div>
        </Panel>
        <Panel icon={SlidersHorizontal} title="Tutor Preferences">
          <div className="space-y-5">
            <Select
              label="Default Session Duration"
              value="1 hour"
              options={["30 minutes", "1 hour", "90 minutes", "2 hours"]}
            />
            <Select
              label="Preferred Session Type"
              value="Both Online & In-person"
              options={["Both Online & In-person", "Online", "In-person"]}
            />
            <div className="flex items-center justify-between gap-3 pt-2">
              <div>
                <p className="text-xs font-semibold">
                  Automatically accept bookings
                </p>
                <p className="mt-1.5 text-[10px] text-[#344568]">
                  Automatically accept new booking requests
                </p>
              </div>
              <Toggle label="Automatically accept bookings" enabled={false} />
            </div>
          </div>
        </Panel>
        <Panel
          icon={Bell}
          title="Notifications"
          className="lg:row-span-2 xl:row-span-1"
        >
          <div className="space-y-5">
            {[
              [UserRoundCheck, "New Student Request"],
              [CalendarCheck, "Booking Confirmation"],
              [Clock3, "Session Reminder"],
              [MessageCircle, "New Message"],
              [Wallet, "Payment / Payout"],
              [Star, "New Review"],
            ].map(([Icon, label]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="rounded bg-[#f2f9f2] p-0.5 text-[#086619]">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="flex-1 text-xs font-medium">{label}</span>
                <Toggle label={label} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel icon={ShieldCheck} title="Privacy">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Online Status</p>
              <p className="mt-1.5 text-[10px] text-[#344568]">
                Show when you are online
              </p>
            </div>
            <Toggle label="Online Status" />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f4] pt-5">
            <div>
              <p className="text-xs font-semibold">Tutor Profile Visibility</p>
              <p className="mt-1.5 text-[10px] text-[#344568]">
                Make your profile visible to students
              </p>
            </div>
            <select
              aria-label="Tutor Profile Visibility"
              defaultValue="Public"
              className="h-9 rounded-md border border-[#dfe5ed] bg-white px-3 text-xs"
            >
              <option>Public</option>
              <option>Private</option>
            </select>
          </div>
        </Panel>
        <Panel
          icon={Globe}
          title="Preferences"
          className="lg:col-span-2 xl:col-span-2"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Language"
              value="English"
              options={["English", "Filipino", "Cebuano"]}
            />
            <Select
              label="Timezone"
              value="(GMT+08:00) Asia/Manila"
              options={[
                "(GMT+08:00) Asia/Manila",
                "(GMT+00:00) UTC",
                "(GMT+09:00) Asia/Tokyo",
              ]}
            />
          </div>
        </Panel>
      </div>
    </section>
  );
}
