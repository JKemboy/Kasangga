import { summarizeEarnings } from "./earnings.js";

export const services = [
  [
    "Calculus 1",
    "Differential & Integral Calculus",
    "Mathematics",
    "College",
    "Clear guidance for core calculus concepts and problem solving.",
    "Limits, Derivatives, Integrals",
    350,
    "Online",
    4.9,
    18,
  ],
  [
    "Physics 1",
    "Mechanics & Motion",
    "Science",
    "College",
    "Concept-focused support for mechanics and quantitative problems.",
    "Kinematics, Dynamics, Laws of Motion",
    400,
    "Online",
    4.8,
    16,
  ],
  [
    "Basic Programming (Python)",
    "Python for Beginners to Intermediate",
    "Computer Science",
    "All Levels",
    "Practical Python fundamentals through guided coding exercises.",
    "Functions, Lists, Problem Solving",
    450,
    "Both",
    4.9,
    22,
  ],
  [
    "Statistics",
    "Probability & Statistics",
    "Mathematics",
    "College",
    "Step-by-step support for statistics and probability.",
    "Descriptive Statistics, Probability, Hypothesis Testing",
    400,
    "Both",
    4.7,
    15,
  ],
  [
    "Linear Algebra",
    "Matrices & Vectors",
    "Mathematics",
    "College",
    "Structured lessons for vectors, matrices, and linear systems.",
    "Matrices, Vector Spaces, Systems of Equations",
    380,
    "In-person",
    4.6,
    8,
  ],
].map((a, i) => ({
  id: String(i + 1),
  name: a[0],
  subtitle: a[1],
  category: a[2],
  level: a[3],
  description: a[4],
  topics: a[5],
  rate: a[6],
  type: a[7],
  rating: a[8],
  completed: a[9],
  status: i === 4 ? "Suspended" : "Active",
}));
export const people = [
  "Maria Angela R.",
  "Allen Ezra M.",
  "Rianne Kate L.",
  "Mark Joseph P.",
  "Lyla Shane B.",
];
const completedAmounts = [525, 450, 600, 500, 400, ...Array(18).fill(400), 675];
export const completed = completedAmounts.map((amount, i) => ({
  id: `completed-${i + 1}`,
  learner: people[i % 5],
  service: [
    "Calculus 1",
    "Basic Programming (Python)",
    "Physics 1",
    "Statistics",
    "Linear Algebra",
  ][i % 5],
  topic: "Practice and review",
  date: ["2026-09-18", "2026-09-19", "2026-09-15", "2026-09-12", "2026-09-10"][
    i % 5
  ],
  start: "09:00",
  end: "10:00",
  type: "Online",
  provider: "Google Meet",
  amount,
  status: "Completed",
  payment: "Paid",
  transaction: `TXN-2026-0918-${String(i + 1).padStart(3, "0")}`,
  booking: `BKG-2026-0918-${String(i + 1).padStart(3, "0")}`,
}));
export const upcoming = [
  {
    id: "up-1",
    learner: people[0],
    service: "Calculus 1",
    topic: "Derivatives",
    date: "2026-09-18",
    start: "14:00",
    end: "15:30",
    type: "Online",
    provider: "Google Meet",
    amount: 525,
    status: "Confirmed",
    payment: "Paid",
  },
  {
    id: "up-2",
    learner: people[1],
    service: "Basic Programming (Python)",
    topic: "Functions and Lists",
    date: "2026-09-19",
    start: "16:00",
    end: "17:00",
    type: "Online",
    provider: "Zoom",
    amount: 450,
    status: "Confirmed",
    payment: "Paid",
  },
  {
    id: "up-3",
    learner: people[4],
    service: "Statistics",
    topic: "Probability Distributions",
    date: "2026-09-21",
    start: "10:00",
    end: "11:30",
    type: "In-person",
    provider: "CCIS Learning Commons",
    amount: 600,
    status: "Pending",
    payment: "Unpaid",
  },
];
export const classes = [
  [0, 8, 10, "IT 108", "Software Architecture", "CCIS 203"],
  [0, 14, 16, "IT 110", "Systems Integration", "CCIS Lab 2"],
  [1, 9, 11, "ITE 18", "Application Development", "CCIS Lab 1"],
  [1, 15, 17, "CSC 120", "Information Assurance", "CCIS 204"],
  [2, 8, 10, "IT 109", "Human–Computer Interaction", "CCIS 202"],
  [2, 13, 15, "LWR", "Life and Works of Rizal", "HIRAYA 105"],
  [3, 8, 10, "IT 108", "Software Architecture", "CCIS 203"],
  [3, 14, 16, "IT 110", "Systems Integration", "CCIS Lab 2"],
  [4, 9, 11, "ITE 18", "Application Development", "CCIS Lab 1"],
  [4, 15, 17, "CSC 120", "Information Assurance", "CCIS 204"],
  [5, 10, 12, "LIE", "Living in the IT Era", "HIRAYA 204"],
];
export const slots = [
  [0, 10, 12, "Online"],
  [1, 11, 13, "Both"],
  [2, 15, 17, "Online"],
  [3, 10, 12, "Both"],
  [4, 11, 13, "Online"],
  [5, 13, 15, "In-person"],
  [6, 9, 12, "Online"],
  [6, 14, 17, "Both"],
  [0, 19, 20, "Online"],
  [1, 18, 19, "Online"],
  [3, 18, 19, "Online"],
  [4, 18, 19, "Online"],
].map(([day, start, end, type], i) => ({
  id: `slot-${i}`,
  day,
  start,
  end,
  type,
  repeat: true,
  date: `2026-09-${14 + day}`,
}));
export const notifications = [
  [
    "Booking Confirmed",
    "Maria Angela R.'s Calculus 1 session is confirmed.",
    "Derivatives · Sep 18, 2026 · 2:00 PM–3:30 PM",
    "2026-09-17 10:32",
    "Bookings",
    "sessions",
    { view: "sessions", args: { sessionId: "up-1" }, label: "View booking" },
  ],
  [
    "Payment Confirmed",
    "₱525.00 was paid for Maria Angela R.'s Calculus 1 session.",
    "GCash via PayMongo · TXN-2026-0918-001",
    "2026-09-17 10:31",
    "Payments",
    "earnings",
    {
      view: "earnings",
      args: { transactionId: "TXN-2026-0918-001" },
      label: "View payment",
    },
  ],
  [
    "Reschedule Request",
    "Mark Joseph P. requested a new schedule for Physics 1.",
    "Review the request from My Sessions.",
    "2026-09-17 09:15",
    "Bookings",
    "sessions",
    {
      view: "messages",
      args: { learner: "Mark Joseph P." },
      label: "Review request",
    },
  ],
  [
    "New Message",
    "Allen Ezra M.: Is the Zoom link ready?",
    "Basic Programming (Python)",
    "2026-09-17 09:15",
    "Messages",
    "messages",
    {
      view: "messages",
      args: { learner: "Allen Ezra M." },
      label: "Open conversation",
    },
  ],
  [
    "Session Reminder",
    "Your session with Allen Ezra M. starts tomorrow at 4:00 PM.",
    "Basic Programming (Python) · Zoom external meeting",
    "2026-09-18 16:00",
    "Sessions",
    "sessions",
    { view: "sessions", args: { sessionId: "up-2" }, label: "View session" },
  ],
  [
    "Service Status Update",
    "Linear Algebra was suspended by Admin.",
    "Moderation applies. Review the service status in My Services.",
    "2026-09-16 15:20",
    "Services",
    "services",
    { view: "services", args: { serviceId: "5" }, label: "View service" },
  ],
  [
    "New Rating/Review",
    "Rianne Kate L. rated your Physics 1 service 5.0 stars.",
    "Completed session · Sep 15, 2026",
    "2026-09-15 18:45",
    "Reviews",
    "services",
    { view: "services", args: { serviceId: "2" }, label: "View rated service" },
  ],
  [
    "Incident Report Update",
    "OSAS updated incident report CASE-2026-014.",
    "Evidence review is in progress.",
    "2026-09-14 14:10",
    "Safety",
    "help",
    {
      view: "help",
      args: { topic: "Incident Reporting" },
      label: "Open incident reporting",
    },
  ],
].map((a, i) => ({
  id: String(i),
  title: a[0],
  text: a[1],
  detail: a[2],
  time: a[3],
  category: a[4],
  view: a[5],
  target: a[6],
  read: i >= 4,
}));
export const profile = {
  name: "Juan Dela Cruz",
  email: "juan.delacruz@csu.edu.ph",
  studentId: "23-IT-10245",
  college: "College of Computing and Information Sciences",
  program: "BS Information Technology",
  year: "3rd Year",
  bio: "Patient and supportive peer tutor who helps students understand challenging concepts through clear explanations and practical examples.",
  expertise: "Calculus, Physics, Statistics, and Python programming",
  skills: "Derivatives, Mechanics, Probability, Python, Problem Solving",
};
export const seed = {
  services,
  sessions: [...upcoming, ...completed],
  slots,
  notifications,
  profile,
  threads: people.map((name, i) => ({
    name,
    messages:
      i === 0
        ? [
            {
              mine: false,
              text: "Good morning, Sir Juan! May I confirm our derivatives session tomorrow?",
              time: "10:02 AM",
            },
            {
              mine: true,
              text: "Good morning, Maria. Yes, our session is confirmed for tomorrow at 2:00 PM.",
              time: "10:05 AM",
            },
            {
              mine: false,
              text: "Thank you! Will we use Google Meet?",
              time: "10:08 AM",
            },
            {
              mine: true,
              text: "Yes. Open the external Google Meet link from My Sessions when it is time.",
              time: "10:10 AM",
            },
            {
              mine: false,
              text: "Noted, Sir. See you tomorrow at 2:00 PM.",
              time: "10:30 AM",
            },
          ]
        : [
            {
              mine: false,
              text: [
                "",
                "Is the Zoom link ready?",
                "Thank you for explaining the examples.",
                "Can I request a new schedule?",
                "I’ll meet you at the Learning Commons.",
              ][i],
              time: "9:15 AM",
            },
          ],
  })),
  reports: [],
  uploads: [],
};
export const money = (v) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    v,
  );
export const minutes = (t) =>
  Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]);
export const hour = (t) => minutes(t) / 60;
export const time = (h) =>
  `${Math.floor(h) % 12 || 12}:${String(Math.round((h % 1) * 60)).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
export const overlaps = (a, b, c, d) => a < d && c < b;
export function slotError(slot, existing, sessions, confirmed = classes) {
  if (
    !Number.isFinite(slot?.start) ||
    !Number.isFinite(slot?.end) ||
    slot.start < 7 ||
    slot.end > 21 ||
    slot.end <= slot.start
  )
    return "Choose an end time after the start time, between 7 AM and 9 PM.";
  const date =
    typeof slot.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(slot.date)
      ? new Date(`${slot.date}T12:00:00`)
      : new Date(NaN);
  const parts = String(slot.date).split("-").map(Number);
  if (
    !Number.isFinite(date.getTime()) ||
    parts[0] < 1 ||
    date.getFullYear() !== parts[0] ||
    date.getMonth() + 1 !== parts[1] ||
    date.getDate() !== parts[2]
  )
    return "Choose a valid availability date.";
  if (
    !Number.isInteger(slot.day) ||
    slot.day < 0 ||
    slot.day > 6 ||
    slot.day !== (date.getDay() + 6) % 7
  )
    return "The availability weekday must match the selected date.";
  if (
    slot.type !== undefined &&
    !["Online", "In-person", "Both"].includes(slot.type)
  )
    return "Choose a valid session type.";
  if (slot.repeat !== undefined && typeof slot.repeat !== "boolean")
    return "Choose a valid weekly repeat option.";
  if (
    confirmed.some(
      ([day, start, end]) =>
        day === slot.day && overlaps(slot.start, slot.end, start, end),
    )
  )
    return "This time overlaps your confirmed class schedule.";
  if (
    (slot.day === 0 || slot.day === 2) &&
    overlaps(slot.start, slot.end, 17, 19)
  )
    return "This time overlaps protected unavailable time.";
  if (
    existing.some(
      (s) =>
        s.id !== slot.id &&
        s.day === slot.day &&
        (s.repeat || slot.repeat || s.date === slot.date) &&
        overlaps(slot.start, slot.end, s.start, s.end),
    )
  )
    return "This time overlaps another availability slot.";
  if (
    sessions.some(
      (s) =>
        s.status === "Confirmed" &&
        (slot.repeat
          ? (new Date(s.date + "T12:00:00").getDay() + 6) % 7 === slot.day
          : s.date === slot.date) &&
        overlaps(slot.start, slot.end, hour(s.start), hour(s.end)),
    )
  )
    return "This time overlaps a confirmed tutoring session.";
  return "";
}
export function allocation(sessions) {
  return summarizeEarnings(sessions);
}
