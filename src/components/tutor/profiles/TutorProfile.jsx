import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Camera,
  ChartNoAxesCombined,
  Clock3,
  GraduationCap,
  Info,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
} from "lucide-react";

const personal = [
  ["Full Name", "Juan Dela Cruz"],
  ["Student ID", "23-IT-10245"],
  ["CSU Email", "juan.delacruz@csu.edu.ph"],
  ["Course / Program", "BS Information Technology"],
  ["Year Level", "3rd Year"],
  ["Contact Number", "0912 345 6789"],
];
const summary = [
  [CalendarDays, "Student ID", "23-IT-10245"],
  [Mail, "CSU Email", "juan.delacruz@csu.edu.ph"],
  [GraduationCap, "Course / Program", "BS Information Technology"],
  [CalendarDays, "Year Level", "3rd Year"],
  [Phone, "Contact Number", "0912 345 6789"],
];
const panel = "rounded-xl border border-[#e3e8ef] bg-white p-4";
function Chips({ items }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-[#eaf5ed] px-2 py-1 text-[10px] font-semibold text-[#183923]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
function TutorDetail({ icon: Icon, label, children }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="flex items-start gap-3 text-[11px] font-semibold">
        <span className="rounded bg-[#f1f8f2] p-0.5 text-[#087522]">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </dt>
      <dd className="min-w-0 text-[10px] leading-5">{children}</dd>
    </div>
  );
}
export default function TutorProfile() {
  return (
    <section className="mx-auto max-w-[1550px] px-4 py-5 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
            Profile
          </h1>
          <p className="mt-2 text-xs font-medium text-[#173a80]">
            View and manage your personal and tutor information.
          </p>
        </div>
        <button
          type="button"
          className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#78b584] bg-white px-3 text-xs font-semibold text-[#087522]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Profile
        </button>
      </div>
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="px-2 py-4">
          <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
            <UserRound
              aria-label="Tutor profile placeholder"
              className="h-16 w-16 text-slate-400"
            />
            <button
              type="button"
              aria-label="Change profile photo"
              className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#087522] text-white"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-4 text-center text-lg font-bold">Juan Dela Cruz</h2>
          <p className="mt-1 text-center text-xs font-medium text-[#087522]">
            Tutor
          </p>
          <dl className="mt-7 space-y-5">
            {summary.map(([Icon, label, value]) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="h-4 w-4 shrink-0 text-[#087522]" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium text-[#173a80]">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-[11px] font-medium">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <BadgeCheck className="h-4 w-4 text-[#087522]" />
              <div>
                <dt className="text-[10px] font-medium text-[#173a80]">
                  Status
                </dt>
                <dd className="mt-1 rounded-md bg-green-100 px-3 py-0.5 text-[10px] font-semibold text-green-800">
                  Active
                </dd>
              </div>
            </div>
          </dl>
        </aside>
        <div className="min-w-0 space-y-4">
          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <section className={panel}>
              <h2 className="text-sm font-semibold">Personal Information</h2>
              <div className="mt-7 grid gap-x-5 gap-y-5 sm:grid-cols-2">
                {personal.map(([label, value]) => (
                  <label
                    key={label}
                    className="min-w-0 text-[10px] font-medium text-[#253455]"
                  >
                    {label}
                    <input
                      readOnly
                      value={value}
                      className="mt-2 h-9 w-full rounded-md border border-[#dfe5ed] bg-white px-2 text-[11px] font-medium text-[#101828]"
                    />
                  </label>
                ))}
              </div>
            </section>
            <section className={panel}>
              <h2 className="text-sm font-semibold">Tutor Information</h2>
              <dl className="mt-6 space-y-5">
                <TutorDetail icon={Pencil} label="Tutor Bio">
                  <p className="font-medium text-[#173a80]">
                    Passionate about helping students understand complex
                    concepts in Math, Physics, and Programming. I aim to create
                    engaging and supportive sessions tailored to each student's
                    learning goals.
                  </p>
                </TutorDetail>
                <TutorDetail icon={SlidersHorizontal} label="Tutor Categories">
                  <Chips items={["STEM", "Programming & IT"]} />
                </TutorDetail>
                <TutorDetail icon={BookOpen} label="Subjects Taught">
                  <Chips
                    items={[
                      "Calculus 1",
                      "Physics 1",
                      "Statistics",
                      "Programming (Python)",
                    ]}
                  />
                </TutorDetail>
                <TutorDetail icon={Pencil} label="Skills">
                  <Chips
                    items={[
                      "Python",
                      "Problem Solving",
                      "Data Analysis",
                      "Algorithm Design",
                    ]}
                  />
                </TutorDetail>
                <TutorDetail icon={CalendarDays} label="Teaching Experience">
                  <span className="font-medium">2 years</span>
                </TutorDetail>
                <TutorDetail icon={Award} label="Certifications / Credentials">
                  <span className="font-medium">
                    CSU Honor Scholar · Python for Everybody (Coursera)
                  </span>
                </TutorDetail>
              </dl>
            </section>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
            <section className={panel}>
              <h2 className="text-sm font-semibold">Tutor Verification</h2>
              <div className="mt-6 flex items-start gap-4">
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#f0f7f2]">
                  <ShieldCheck
                    className="h-14 w-14 fill-[#087522] text-white"
                    strokeWidth={1.5}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold">
                      Verification Status
                    </h3>
                    <span className="rounded-md bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-800">
                      Verified
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] font-medium leading-5 text-[#173a80]">
                    Your identity and credentials have been verified by
                    CampusTutor.
                  </p>
                  <p className="mt-5 text-[11px] font-medium text-[#253455]">
                    Date Approved
                  </p>
                  <p className="mt-1 text-xs font-medium">March 10, 2024</p>
                </div>
              </div>
            </section>
            <div className="flex min-w-0 flex-col gap-4">
              <section className={`${panel} flex-1`}>
                <h2 className="text-sm font-semibold">Tutor Statistics</h2>
                <div className="mt-6 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
                  {[
                    [Star, "4.8", "Average Rating", "Excellent"],
                    [CalendarDays, "156", "Completed Sessions", "All time"],
                    [ChartNoAxesCombined, "96%", "Response Rate", "This month"],
                    [Clock3, "1 hr", "Avg. Response Time", "This month"],
                  ].map(([Icon, value, label, detail], index) => (
                    <div
                      key={label}
                      className="px-2 text-center sm:border-l sm:border-[#edf0f4] sm:first:border-l-0"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Icon className="h-4 w-4 shrink-0 text-[#087522]" />
                        <p className="text-xl font-bold">{value}</p>
                      </div>
                      <h3 className="mt-3 text-[9px] font-medium text-[#173a80]">
                        {label}
                      </h3>
                      <p
                        className={`mt-1 text-[9px] ${index === 0 ? "font-semibold text-green-800" : "text-[#173a80]"}`}
                      >
                        {detail}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <p className="flex items-center gap-3 rounded-lg bg-[#eff7f1] px-4 py-3 text-[10px] font-medium text-green-800">
                <Info className="h-4 w-4 shrink-0" />
                Keep your profile updated to help students know more about you
                and your tutoring services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
