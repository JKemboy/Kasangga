import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Search,
} from "lucide-react";

const students = [
  {
    name: "Maria Angela R.",
    initials: "MA",
    degree: "BS Information Technology",
    year: "2nd Year",
    subjects: ["Calculus 1", "Statistics"],
    total: 12,
    completed: 9,
    lastDate: "May 10, 2025",
    lastTime: "11:00 AM",
    nextDate: "May 20, 2025",
    nextTime: "2:00 PM",
    status: "Active",
    color: "bg-[#e7f4eb] text-green-800",
  },
  {
    name: "Mark Joseph P.",
    initials: "MJ",
    degree: "BS Physics",
    year: "3rd Year",
    subjects: ["Physics 1", "Physics 2"],
    total: 10,
    completed: 7,
    lastDate: "May 9, 2025",
    lastTime: "4:00 PM",
    nextDate: "May 16, 2025",
    nextTime: "4:00 PM",
    status: "Active",
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "Rianne Kate L.",
    initials: "RK",
    degree: "BS Information Technology",
    year: "2nd Year",
    subjects: ["Programming (Python)"],
    total: 14,
    completed: 11,
    lastDate: "May 12, 2025",
    lastTime: "1:00 PM",
    nextDate: "May 19, 2025",
    nextTime: "1:00 PM",
    status: "Active",
    color: "bg-purple-50 text-purple-600",
  },
  {
    name: "Allen Ezra M.",
    initials: "AE",
    degree: "BS Information Technology",
    year: "3rd Year",
    subjects: ["Statistics", "Linear Algebra"],
    total: 8,
    completed: 6,
    lastDate: "May 11, 2025",
    lastTime: "3:00 PM",
    nextDate: "May 18, 2025",
    nextTime: "3:00 PM",
    status: "Active",
    color: "bg-[#e7f4eb] text-green-800",
  },
  {
    name: "Lyla Shane B.",
    initials: "LS",
    degree: "BS Mathematics",
    year: "2nd Year",
    subjects: ["Linear Algebra"],
    total: 6,
    completed: 4,
    lastDate: "May 8, 2025",
    lastTime: "10:00 AM",
    nextDate: "May 15, 2025",
    nextTime: "10:00 AM",
    status: "Inactive",
    color: "bg-amber-50 text-amber-600",
  },
];
function SessionDate({ date, time }) {
  return (
    <div className="space-y-2 text-[11px] font-medium">
      <p className="flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3 text-[#61708f]" />
        {date}
      </p>
      <p className="flex items-center gap-1.5">
        <Clock3 className="h-3 w-3 text-[#61708f]" />
        {time}
      </p>
    </div>
  );
}
const actionClass =
  "h-8 rounded-md border border-[#bedbca] bg-white px-2 text-[10px] font-semibold text-green-800 hover:bg-green-50";
export default function TutorStudents() {
  return (
    <section className="mx-auto max-w-[1550px] px-4 py-4 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
        My Students
      </h1>
      <p className="mt-1 text-xs font-medium text-[#253455]">
        View and manage students you are tutoring.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.5fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search students</span>
          <input
            type="search"
            placeholder="Search students..."
            className="h-9 w-full rounded-md border border-[#dfe5ed] bg-white pl-3 pr-9 text-xs outline-none focus:border-green-700"
          />
          <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#61708f]" />
        </label>
        <select
          aria-label="Filter students by subject"
          className="h-9 rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-medium"
        >
          <option>All Subjects</option>
        </select>
        <select
          aria-label="Filter students by status"
          className="h-9 rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-medium"
        >
          <option>All Statuses</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-[#e4e8ef] bg-white">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <caption className="sr-only">
            Students, subjects, session counts, last and next sessions, and
            status
          </caption>
          <thead className="bg-[#fafbfc] text-[10px] font-semibold text-[#101828]">
            <tr>
              <th rowSpan={2} scope="col" className="px-4 py-3">
                Student
              </th>
              <th rowSpan={2} scope="col" className="px-3 py-3">
                Subjects
              </th>
              <th
                colSpan={2}
                scope="colgroup"
                className="px-3 pb-1 pt-3 text-center"
              >
                Sessions
              </th>
              <th rowSpan={2} scope="col" className="px-3 py-3">
                Last Session
              </th>
              <th rowSpan={2} scope="col" className="px-3 py-3">
                Next Session
              </th>
              <th rowSpan={2} scope="col" className="px-3 py-3 text-center">
                Status
              </th>
              <th rowSpan={2} scope="col" className="px-3 py-3 text-center">
                Actions
              </th>
            </tr>
            <tr>
              <th scope="col" className="px-3 pb-3 text-center">
                Total
              </th>
              <th scope="col" className="px-3 pb-3 text-center">
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.name} className="hover:bg-slate-50/50">
                <th scope="row" className="px-4 py-5 font-normal">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-[#cfddd5] text-sm font-semibold text-green-800"
                    >
                      {student.initials}
                    </span>
                    <div>
                      <h2 className="text-xs font-bold text-[#101828]">
                        {student.name}
                      </h2>
                      <p className="mt-1 text-[10px] text-[#45516e]">
                        {student.degree}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold">
                        {student.year}
                      </p>
                    </div>
                  </div>
                </th>
                <td className="max-w-[220px] px-3 py-5">
                  <div className="flex flex-wrap gap-2">
                    {student.subjects.map((subject) => (
                      <span
                        key={subject}
                        className={`rounded px-2 py-1 text-[10px] font-semibold ${student.color}`}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-5 text-center text-xs font-bold">
                  {student.total}
                </td>
                <td className="px-3 py-5 text-center text-xs font-bold">
                  {student.completed}
                </td>
                <td className="whitespace-nowrap px-3 py-5">
                  <SessionDate
                    date={student.lastDate}
                    time={student.lastTime}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-5">
                  <SessionDate
                    date={student.nextDate}
                    time={student.nextTime}
                  />
                </td>
                <td className="px-3 py-5 text-center">
                  <span
                    className={`rounded px-2 py-1 text-[10px] font-semibold ${student.status === "Active" ? "bg-[#e7f4eb] text-green-800" : "bg-blue-50 text-blue-600"}`}
                  >
                    {student.status}
                  </span>
                </td>
                <td className="w-[166px] px-3 py-5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      className={`${actionClass} whitespace-nowrap`}
                    >
                      View Student
                    </button>
                    <button type="button" className={actionClass}>
                      Message
                    </button>
                    <button
                      type="button"
                      className={`${actionClass} col-span-2 flex items-center justify-center gap-2 text-[#253455]`}
                    >
                      <History className="h-3 w-3 text-green-800" />
                      Session History
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#45516e]">
          Showing 1 to 5 of 18 students
        </p>
        <nav aria-label="Student pages" className="flex gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled
            className="grid h-8 w-8 place-items-center rounded-md border border-[#e4e8ef] bg-white text-slate-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3, 4].map((page) => (
            <button
              key={page}
              type="button"
              aria-current={page === 1 ? "page" : undefined}
              className={`h-8 w-8 rounded-md border text-xs font-semibold ${page === 1 ? "border-green-800 bg-green-800 text-white" : "border-[#e4e8ef] bg-white"}`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded-md border border-[#e4e8ef] bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </footer>
    </section>
  );
}
