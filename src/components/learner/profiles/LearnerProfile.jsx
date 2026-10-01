import { useState } from "react";
import { button, primary } from "../../tutor/workspace/ui.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  GraduationCap,
  Mail,
  Pencil,
  UserRound,
  UsersRound,
} from "lucide-react";
const Field = ({
  label,
  value,
  editable = false,
  onChange,
  managed = false,
}) => (
  <label className="block text-xs font-medium text-[#37456a]">
    <span>{label}</span>
    {managed && (
      <small className="ml-2 text-slate-500">Managed by CarSU records</small>
    )}
    <input
      readOnly={!editable}
      value={value}
      onChange={onChange}
      className={
        "mt-1 h-9 w-full rounded-md border border-[#dfe5ed] px-3 text-xs font-normal text-[#27344f] focus:outline-green-700 " +
        (editable ? "bg-white" : "bg-slate-50")
      }
    />
  </label>
);
const Edit = ({ section, editing, onEdit, onSave, onCancel }) =>
  editing === section ? (
    <div className="flex gap-2">
      <button type="button" className={button} onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className={primary} onClick={onSave}>
        Save Changes
      </button>
    </div>
  ) : (
    <button
      type="button"
      disabled={!!editing}
      className={button}
      onClick={() => onEdit(section)}
    >
      <Pencil className="mr-1 inline h-3 w-3" />
      Edit
    </button>
  );
export default function LearnerProfile() {
  const work = useLearnerWorkspace();
  const profile = {
    phone: "0912 345 6789",
    bio: "",
    year: "3rd Year",
    interests: [
      "Programming",
      "Web Development",
      "Database Systems",
      "Algorithms",
      "Data Structures",
    ],
    ...work.data.profile,
  };
  const [editing, setEditing] = useState(null),
    [draft, setDraft] = useState({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const value = (field) =>
    editing && Object.hasOwn(draft, field) ? draft[field] : profile[field];
  const change = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const edit = (section) => {
    setEditing(section);
    setError("");
    setNotice("");
    setDraft(
      section === "personal"
        ? { phone: profile.phone }
        : section === "academic"
          ? { year: profile.year }
          : section === "bio"
            ? { bio: profile.bio }
            : { interests: profile.interests.join(", ") },
    );
  };
  const cancel = () => {
    setEditing(null);
    setDraft({});
    setError("");
  };
  function save() {
    let values = { ...draft };
    if (editing === "personal") {
      values.phone = values.phone.replace(/[\s-]/g, "");
      if (values.phone && !/^09\d{9}$/.test(values.phone))
        return setError(
          "Enter an 11-digit mobile number starting with 09, or leave it blank.",
        );
    }
    if (editing === "bio") {
      values.bio = values.bio.trim();
      if (values.bio.length > 1000)
        return setError("Keep your bio within 1,000 characters.");
    }
    if (editing === "interests") {
      values.interests = [
        ...new Set(
          values.interests
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ];
      if (
        values.interests.length > 15 ||
        values.interests.some((v) => v.length > 60)
      )
        return setError(
          "Use up to 15 subjects, with up to 60 characters each.",
        );
    }
    if (work.commit((d) => ({ ...d, profile: { ...d.profile, ...values } }))) {
      cancel();
      setNotice("Changes saved on this browser.");
    } else setError("Could not save your changes. Please try again.");
  }
  const controls = (section) => (
    <Edit
      section={section}
      editing={editing}
      onEdit={edit}
      onCancel={cancel}
      onSave={save}
    />
  );

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Profile
      </h1>
      <p className="mt-1 text-xs font-medium text-[#2849ad]">
        Manage your personal information and account details.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-green-700">
          {notice}
        </p>
      )}
      <div className="mt-3 grid items-start gap-3 [&>div]:min-w-0 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="rounded-xl bg-[linear-gradient(145deg,#f1faf5,#fbfdfc)] p-3 text-center lg:row-span-2">
          <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-slate-200 text-slate-400 shadow">
            <UserRound className="h-11 w-11" />
            <button
              type="button"
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-4 border-white bg-[#087542] text-white"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-2 text-base font-bold">Juan Dela Cruz</h2>
          <p className="mt-1 text-sm font-semibold text-[#087542]">Learner</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#dff8e8] px-3 py-1 text-xs font-semibold text-[#087542]">
            <span className="h-2 w-2 rounded-full bg-[#087542]" />
            Active Account
          </span>
          <div className="my-3 h-px bg-[#d7e5df]" />
          <div className="space-y-3 break-words text-left text-xs text-[#566584]">
            <p className="flex gap-2">
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#087542]" />
              <span>
                <b className="block text-[#637191]">Student ID</b>23-IT-10245
              </span>
            </p>
            <p className="flex gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#087542]" />
              <span>
                <b className="block text-[#637191]">CSU Email</b>
                juan.delacruz@carsu.edu.ph
              </span>
            </p>
            <p className="flex gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-[#087542]" />
              <span>
                <b className="block text-[#637191]">Course / Program</b>BS
                Information Technology
              </span>
            </p>
            <p className="flex gap-2">
              <UsersRound className="h-4 w-4 shrink-0 text-[#087542]" />
              <span>
                <b className="block text-[#637191]">Year Level</b>
                {profile.year}
              </span>
            </p>
            <p className="flex gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-[#087542]" />
              <span>
                <b className="block text-[#637191]">College</b>College of
                Computing &amp; Information Sciences
              </span>
            </p>
          </div>
        </aside>
        <div className="space-y-2">
          <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Personal Information</h2>
              {controls("personal")}
            </div>
            <div className="mt-2 space-y-2">
              <Field label="Full Name" value="Juan Dela Cruz" managed />
              <Field label="Student ID" value="23-IT-10245" managed />
              <Field label="Email Address" value="juan.delacruz@carsu.edu.ph" />
              <p className="text-xs text-slate-500">
                To update your CSU email or Student ID, contact the support
                team.
              </p>
              <Field
                label="Phone Number (optional)"
                value={value("phone")}
                editable={editing === "personal"}
                onChange={(e) => change("phone", e.target.value)}
              />
            </div>
          </section>
          <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">About Me</h2>
              {controls("bio")}
            </div>
            <label className="mt-2 block text-xs font-medium text-[#37456a]">
              Short Bio
              <textarea
                readOnly={editing !== "bio"}
                value={value("bio")}
                onChange={(e) => change("bio", e.target.value)}
                maxLength={1000}
                placeholder="Tell tutors about yourself..."
                className="mt-1 h-14 w-full resize-none rounded-md border border-[#dfe5ed] p-2 text-xs"
              />
            </label>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold">
                Study Interests / Preferred Subjects
              </p>
              {controls("interests")}
            </div>
            {editing === "interests" && (
              <label className="mt-2 block text-xs">
                Separate subjects with commas
                <textarea
                  className="mt-1 w-full rounded border border-slate-200 p-2"
                  value={draft.interests}
                  onChange={(e) => change("interests", e.target.value)}
                  maxLength={1000}
                />
              </label>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.interests.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#dff8e8] px-2 py-1 text-xs font-semibold text-[#087542]"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-2">
          <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Academic Information</h2>
              {controls("academic")}
            </div>
            <div className="mt-2 space-y-2">
              <Field
                label="Course / Program"
                value="BS Information Technology"
              />
              <label className="block text-xs font-medium">
                Year Level
                <select
                  disabled={editing !== "academic"}
                  value={value("year")}
                  onChange={(e) => change("year", e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                >
                  {[
                    "1st Year",
                    "2nd Year",
                    "3rd Year",
                    "4th Year",
                    "5th Year",
                  ].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <Field
                label="College"
                value="College of Computing & Information Sciences"
              />
            </div>
          </section>
          <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
            <h2 className="text-sm font-bold">Roles / Account Status</h2>
            <div className="mt-2 rounded-lg bg-[#effaf3] p-2.5">
              <p className="flex items-center gap-2 text-sm font-bold">
                <UserRound className="h-4 w-4 text-[#087542]" />
                Learner{" "}
                <span className="ml-auto text-xs text-[#087542]">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  Active
                </span>
              </p>
              <p className="mt-1 pl-6 text-xs text-[#566584]">
                You have full access as a learner.
              </p>
            </div>
            <div className="mt-2 rounded-lg border border-[#e1e7ef] p-2.5">
              <p className="flex items-center gap-2 text-sm font-bold">
                <BookOpen className="h-4 w-4 text-[#d99000]" />
                Tutor{" "}
                <span className="ml-auto text-xs text-[#d99000]">
                  {work.data.application?.status || "Not Applied"}
                </span>
              </p>
              <button
                onClick={() => work.open("application")}
                type="button"
                className="mt-2 h-7 rounded-md border border-[#15924f] px-4 text-xs font-semibold text-[#087542]"
              >
                {work.data.application ? "View Application" : "Apply as Tutor"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
