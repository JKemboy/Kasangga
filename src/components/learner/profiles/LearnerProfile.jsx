import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
﻿import {
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
const Field = ({ label, value }) => (
  <label className="block text-xs font-medium text-[#37456a]">
    <span>{label}</span>
    <input
      readOnly
      value={value}
      className="mt-1 h-8 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-normal text-[#27344f]"
    />
  </label>
);
const Edit = () => {const work=useLearnerWorkspace();return (
  <button onClick={()=>work.open("editProfile")}
    type="button"
    className="flex h-7 shrink-0 items-center gap-2 rounded-md border border-[#15924f] px-4 text-xs font-semibold text-[#087542]"
  >
    <Pencil className="h-4 w-4" />
    Edit
  </button>
);};
export default function LearnerProfile() {
  const work=useLearnerWorkspace();
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Profile
      </h1>
      <p className="mt-1 text-xs font-medium text-[#2849ad]">
        Manage your personal information and account details.
      </p>
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
                <b className="block text-[#637191]">Year Level</b>3rd Year
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
              <Edit />
            </div>
            <div className="mt-2 space-y-2">
              <Field label="Full Name" value="Juan Dela Cruz" />
              <Field label="Student ID" value="23-IT-10245" />
              <Field label="Email Address" value="juan.delacruz@carsu.edu.ph" />
              <Field label="Phone Number" value="0912 345 6789" />
            </div>
          </section>
          <section className="rounded-xl border border-[#e1e7ef] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">About Me</h2>
              <Edit />
            </div>
            <label className="mt-2 block text-xs font-medium text-[#37456a]">
              Short Bio
              <textarea
                readOnly
                value=""
                placeholder="Tell tutors about yourself..."
                className="mt-1 h-14 w-full resize-none rounded-md border border-[#dfe5ed] p-2 text-xs"
              />
            </label>
            <p className="mt-2 text-xs font-bold">
              Study Interests / Preferred Subjects
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "Programming",
                "Web Development",
                "Database Systems",
                "Algorithms",
                "Data Structures",
              ].map((item) => (
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
              <Edit />
            </div>
            <div className="mt-2 space-y-2">
              <Field
                label="Course / Program"
                value="BS Information Technology"
              />
              <Field label="Year Level" value="3rd Year" />
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
                  Not Applied
                </span>
              </p>
              <button onClick={()=>work.open("application")}
                type="button"
                className="mt-2 h-7 rounded-md border border-[#15924f] px-4 text-xs font-semibold text-[#087542]"
              >
                Apply as Tutor
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
