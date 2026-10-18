import PortalAvatar from "../../shared/PortalAvatar.jsx";
import BookingMessages from "../../shared/BookingMessages.jsx";
import SessionDetails from "./SessionDetails.jsx";
import { time, hour } from "./data.js";
import { useInteractions } from "../../shared/InteractionProvider.jsx";
import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Info,
  Send,
  CalendarDays,
  Check,
  LockKeyhole,
  Pencil,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import {
  Heading,
  Panel,
  Avatar,
  Badge,
  Modal,
  Field,
  button,
  primary,
  input,
  matches,
  Empty,
} from "./ui.jsx";
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
  saveTutorInformation,
  profileLoading,
  tutorProfileError,
  refreshTutorInformation,
}) {
  const [editing, setEditing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const { confirm } = useInteractions();
  const dirty = useRef(false);
  async function closeProfile() {
    if (profileSaving) return;
    if (
      !dirty.current ||
      (await confirm({
        title: "Discard your changes?",
        message: "Your bio, expertise and topics return to the saved version.",
        accept: "Discard Changes",
        cancel: "Keep Editing",
        danger: true,
      }))
    ) {
      setEditing(false);
      dirty.current = false;
    }
  }
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
              View and manage your student and tutor information.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-white px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-50"
            disabled={profileLoading || !!tutorProfileError}
            onClick={() => {
              setProfileError("");
              setEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        </div>
        <section
          aria-label="Tutor profile summary"
          className="grid items-center gap-4 rounded-lg border border-[#e0e7f0] bg-white px-4 py-2 lg:grid-cols-[1.1fr_1fr]"
        >
          <div className="flex items-center gap-4">
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
              <h2 className="break-words text-xl font-bold tracking-tight text-black">
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
                Approved by CampusTutor Admin
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-[#e0e7f0] pt-3 text-[#344675] lg:min-h-20 lg:items-center lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <LockKeyhole className="h-5 w-5 shrink-0" />
            <div className="max-w-xs text-xs leading-[1.5]">
              <p className="mb-1 font-medium">System-managed</p>
              <p>
                Your verification and role status are managed by CampusTutor and
                cannot be edited.
              </p>
            </div>
          </div>
        </section>
        {profileLoading && <p role="status">Loading tutor information...</p>}
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
        <div className="grid items-stretch gap-2.5 lg:grid-cols-2">
          <section className="min-w-0 rounded-lg border border-[#e0e7f0] bg-white p-3">
            <h2 className="mb-2 text-sm font-bold tracking-tight text-black">
              Academic Information
            </h2>
            <dl className="space-y-1.5">
              {fields.map(([key, label]) => (
                <div
                  key={key}
                  className="grid gap-0.5 sm:grid-cols-[34%_minmax(0,1fr)] sm:gap-3"
                >
                  <dt className="font-medium text-[#344675]">{label}</dt>
                  <dd className="min-w-0 break-words">{p[key]}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="min-w-0 rounded-lg border border-[#e0e7f0] bg-white p-3">
            <h2 className="mb-2 text-sm font-bold tracking-tight text-black">
              Tutor Information
            </h2>
            <dl className="space-y-2">
              {[
                ["Tutor Bio", p.bio],
                ["Expertise Summary", p.expertise],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-0.5 sm:grid-cols-[29%_minmax(0,1fr)] sm:gap-3"
                >
                  <dt className="font-medium text-[#344675]">{label}</dt>
                  <dd className="min-w-0 break-words">{value}</dd>
                </div>
              ))}
              <div className="grid gap-1 sm:grid-cols-[29%_minmax(0,1fr)] sm:gap-3">
                <dt className="font-medium text-[#344675]">Topics / Skills</dt>
                <dd className="flex min-w-0 flex-wrap gap-1.5">
                  {p.skills
                    .split(",")
                    .filter((skill) => skill.trim())
                    .map((skill, i) => (
                      <span
                        key={i}
                        className="max-w-full break-words rounded-md bg-[#e6f6ec] px-2.5 py-1 font-semibold text-green-950"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                </dd>
              </div>
            </dl>
          </section>
        </div>
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
                className="flex min-w-0 items-center gap-2.5 lg:border-l lg:border-[#e0e7f0] lg:pl-3 lg:first:border-l-0 lg:first:pl-0"
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
            Verification, role status, rating, and completed-session totals are
            managed by CampusTutor and cannot be edited.
          </p>
        </section>
      </section>
      {editing && (
        <Modal title="Edit Profile" onClose={closeProfile}>
          <form
            className="space-y-3"
            onChange={() => {
              dirty.current = true;
            }}
            onSubmit={async (e) => {
              if (profileSaving) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              const values = Object.fromEntries(new FormData(e.currentTarget));
              if (values.bio.trim().length < 30)
                return setProfileError(
                  "Write at least 30 characters in your bio.",
                );
              if (values.expertise.trim().length < 5)
                return setProfileError(
                  "Add an expertise summary of at least 5 characters.",
                );
              if (!values.skills.trim())
                return setProfileError("Add at least one topic or skill.");
              setProfileSaving(true);
              setProfileError("");
              try {
                await saveTutorInformation(values);
              } catch (error) {
                setProfileError(error.message);
                return;
              } finally {
                setProfileSaving(false);
              }
              dirty.current = false;
              setProfileError("");
              setEditing(false);
            }}
          >
            {[
              // Academic identity is managed by the university.

              ["bio", "Tutor Bio"],
              ["expertise", "Expertise Summary"],
              ["skills", "Topics / Skills (comma separated)"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                name={key}
                type={key === "email" ? "email" : "text"}
                required
                disabled={profileSaving}
                maxLength={key === "bio" ? 1000 : 300}
                defaultValue={p[key]}
              />
            ))}
            {profileError && (
              <p role="alert" className="text-xs text-red-600">
                {profileError}
              </p>
            )}
            <button className={primary} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              className={button}
              disabled={profileSaving}
              onClick={closeProfile}
            >
              Cancel
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
