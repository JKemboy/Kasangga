// Tutor account sections: messages and read-only information from the approved application.
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import OwnGcashAccount from "../../shared/OwnGcashAccount.jsx";
import BookingMessages from "../../shared/BookingMessages.jsx";
import {
  CalendarDays,
  Check,
  LockKeyhole,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { Badge } from "./ui.jsx";
export function Messages({ args = {} }) {
  return (
    <BookingMessages
      role="tutor"
      initialName={args.learner || ""}
      initialBookingId={args.bookingId || ""}
    />
  );
}
export { default as Notifications } from "./Notifications.jsx";
export function Profile({
  data,
  profileLoading,
  tutorProfileError,
  refreshTutorInformation,
}) {
  const p = data.profile;
  const fields = [
    ["name", "Full Name"],
    ["email", "CSU Email"],
    ["studentId", "Student ID"],
    ["college", "College"],
    ["program", "Program"],
    ["year", "Year Level"],
  ];
  return (
    <>
      <section className="space-y-2 pb-1 text-xs leading-[1.5] text-[#101828]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              Tutor Profile
            </h1>
            <p className="mt-0.5 text-xs text-[#001ca8]">
              View your student information and approved tutor application
              details.
            </p>
          </div>
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside
            aria-label="Tutor profile summary"
            className="min-w-0 rounded-xl bg-[linear-gradient(145deg,#f1faf5,#fbfdfc)] p-3 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative shrink-0">
                <PortalAvatar
                  name={p.name}
                  role="tutor"
                  editable
                  className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-2xl font-semibold text-green-800"
                />
                <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-green-700 text-white">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-base font-bold tracking-tight text-black">
                  {p.name}
                </h2>
                <p className="mb-1 mt-0.5 text-xs font-medium text-green-800">
                  Student Tutor
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#def3e5] px-2 py-1 font-semibold text-green-900">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Tutor Role: Verified / Active
                </span>
                <p className="mt-1 text-[11px] text-[#344675]">
                  Approved by Kasangga LCO
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 border-t border-[#d7e5df] pt-3 text-left text-[#344675]">
              <LockKeyhole className="h-5 w-5 shrink-0" />
              <div className="max-w-xs text-xs leading-[1.5]">
                <p className="mb-1 font-medium">System-managed</p>
                <p>
                  Your verification and role status are managed by Kasangga and
                  cannot be edited.
                </p>
              </div>
            </div>
          </aside>
          <div className="min-w-0 space-y-3">
            {profileLoading && (
              <p role="status">Loading tutor information...</p>
            )}
            {tutorProfileError && (
              <p role="alert" className="text-red-700">
                {tutorProfileError}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={refreshTutorInformation}
                >
                  Retry
                </button>
              </p>
            )}
            <div className="grid items-start gap-3 xl:grid-cols-2">
              <section className="min-w-0 rounded-xl border border-[#e1e7ef] bg-white p-3">
                <h2 className="mb-2 text-sm font-bold tracking-tight text-black">
                  Academic Information
                </h2>
                <dl className="space-y-1.5">
                  {fields.map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <dt className="font-medium text-[#344675]">{label}</dt>
                      <dd className="min-h-9 min-w-0 whitespace-pre-wrap break-words rounded-md border border-[#dfe5ed] bg-slate-50 px-3 py-2 text-[#27344f]">
                        {p[key] || "Not provided"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="min-w-0 rounded-xl border border-[#e1e7ef] bg-white p-3">
                <h2 className="mb-2 text-sm font-bold tracking-tight text-black">
                  Tutor Information
                </h2>
                <p className="mb-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <LockKeyhole size={14} />
                  Read-only information from your approved tutor application.
                </p>
                {!profileLoading && !tutorProfileError && (
                  <dl className="space-y-2">
                    {[
                      ["Tutor Bio", p.bio],
                      ["Subjects / Areas of Expertise", p.expertise],
                      ...(p.skills ? [["Topics / Skills", p.skills]] : []),
                      [
                        "Course Code",
                        p.approvedApplication?.courseCode || "Not provided",
                      ],
                      [
                        "Course Description",
                        p.approvedApplication?.courseDescription ||
                          "Not provided",
                      ],
                      [
                        "Tutoring Experience",
                        p.approvedApplication?.experience || "Not provided",
                      ],
                      [
                        "Reason for Applying",
                        p.approvedApplication?.motivation || "Not provided",
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <dt className="font-medium text-[#344675]">{label}</dt>
                        <dd className="min-h-9 min-w-0 whitespace-pre-wrap break-words rounded-md border border-[#dfe5ed] bg-slate-50 px-3 py-2 text-[#27344f]">
                          {value || "Not provided"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            </div>
            <OwnGcashAccount />
            <section className="rounded-lg border border-[#e0e7f0] bg-white p-3">
              <h2 className="mb-2 text-sm font-bold tracking-tight text-black">
                Tutor Status &amp; Performance
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [ShieldCheck, "Tutor Verification Status", "Verified", true],
                  [UserRound, "Role Status", "Active", true],
                  [
                    Star,
                    "Average Rating",
                    data.profile.reviewCount > 0 &&
                    Number.isFinite(data.profile.rating)
                      ? data.profile.rating.toFixed(1)
                      : "Not rated yet",
                    false,
                  ],
                  [
                    CalendarDays,
                    "Completed Sessions",
                    data.sessions.filter(
                      (session) => session.status === "Completed",
                    ).length,
                    false,
                  ],
                ].map(([Icon, label, value, green]) => (
                  <div
                    key={label}
                    className="flex min-w-0 items-center gap-2.5 rounded-lg border border-[#e1e7ef] bg-slate-50 p-2"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ef] text-green-800">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] text-[#344675]">{label}</p>
                      <p
                        className={
                          green
                            ? "text-xl font-bold text-green-800"
                            : "text-xl font-bold text-black"
                        }
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-2 rounded-md bg-[#edf8f1] px-3 py-2 text-[11px] leading-4 text-green-900">
                <LockKeyhole className="h-4 w-4 shrink-0" />
                Verification, role status, rating, and completed-session totals
                are managed by Kasangga and cannot be edited.
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
