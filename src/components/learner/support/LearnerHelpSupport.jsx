import {useState} from "react";
import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
﻿import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Headphones,
  Info,
  MessageCircle,
  Rocket,
  Search,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
const topics = [
  [
    Rocket,
    "Getting Started",
    "Learn the basics of using CampusTutor as a learner.",
    "text-[#087542]",
    "bg-[#e5f8ec]",
  ],
  [
    Search,
    "Finding a Tutor",
    "How to search, filter, and choose the right tutor.",
    "text-[#087542]",
    "bg-[#e5f8ec]",
  ],
  [
    CalendarDays,
    "Booking Sessions",
    "How to book, reschedule, or manage your tutoring sessions.",
    "text-[#1675df]",
    "bg-[#e7f3ff]",
  ],
  [
    CircleDollarSign,
    "Payments",
    "Learn about GCash payments via PayMongo, transaction status, and receipts.",
    "text-[#f2a400]",
    "bg-[#fff4dc]",
  ],
  [
    MessageCircle,
    "Messages",
    "Learn how to message tutors and manage conversations.",
    "text-[#f2a400]",
    "bg-[#fff4dc]",
  ],
  [
    UserRound,
    "Tutor Application",
    "Information for students who want to become tutors.",
    "text-[#813ee6]",
    "bg-[#f1e8ff]",
  ],
  [
    Star,
    "Reviews",
    "How reviews work and how to leave feedback.",
    "text-[#e545bb]",
    "bg-[#fde9f8]",
  ],
  [
    ShieldCheck,
    "Account & Security",
    "Manage your account, password, and security settings.",
    "text-[#64748b]",
    "bg-[#f0f1f3]",
  ],
];
export default function LearnerHelpSupport() {
 const work=useLearnerWorkspace();const [query,setQuery]=useState("");
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Help &amp; Support
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Find answers to common questions or contact our support team.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <label className="relative block">
            <span className="sr-only">Search help topics</span>
            <input
              type="search" value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Search help topics..."
              className="h-9 w-full rounded-md border border-[#dbe3ed] pl-9 pr-3 text-xs outline-none focus:border-[#087542] focus:ring-2 focus:ring-[#087542]/15"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#566584]" />
          </label>
          <h2 className="mt-2 text-base font-bold">Help Categories</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {topics.filter(t=>`${t[1]} ${t[2]}`.toLowerCase().includes(query.toLowerCase())).map(([Icon, title, detail, color, background]) => (
              <button
                key={title}
                onClick={()=>work.open("article",{title,body:detail})}
                type="button"
                className="flex min-h-[80px] items-center gap-2 rounded-lg border border-[#e1e7ef] bg-white p-3 text-left hover:border-[#b9d9c4]"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${background} ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#101828]">
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-4 text-[#566584]">
                    {detail}
                  </span>
                </span>
                <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-black" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2 rounded-lg bg-[#e9f6ff] p-3">
            <Info className="h-5 w-5 shrink-0 text-[#1675df]" />
            <div>
              <h2 className="text-sm font-bold">Safety Reminder</h2>
              <p className="mt-2 text-xs leading-4 text-[#566584]">
                For your safety, keep booking, payment, and important session
                coordination within CampusTutor. Report any suspicious or
                inappropriate activity through our platform.
              </p>
            </div>
          </div>
        </div>
        <aside className="space-y-3">
          <section className="rounded-lg bg-[linear-gradient(145deg,#effaf3,#e6f6ee)] p-3 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-[#087542]">
              <Headphones className="h-6 w-6" />
            </span>
            <h2 className="mt-2 text-base font-bold">Need More Help?</h2>
            <p className="mt-3 text-xs leading-4 text-[#566584]">
              Can’t find what you’re looking for?
              <br />
              Our support team is here to help.
            </p>
            <button onClick={()=>work.message({name:"CampusTutor Support"})}
              type="button"
              className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#087542] text-xs font-semibold text-white"
            >
              <MessageCircle className="h-5 w-5" />
              Contact Support
            </button>
            <p className="mt-2 text-xs text-[#566584]">
              We typically respond within
              <br />
              24 hours.
            </p>
          </section>
          <section className="rounded-lg border border-[#e1e7ef] bg-white p-3">
            <h2 className="text-sm font-bold">Popular Articles</h2>
            <div className="mt-2 space-y-2">
              {[
                "How do I book a session?",
                "How do payments work?",
                "What is the cancellation policy?",
                "How do I leave a review?",
                "How do I become a tutor?",
              ].map((article) => (
                <button
                  key={article}
                  onClick={()=>work.open("article",{title:article,body:article.includes("payment")?"Payments use GCash through PayMongo. Booking status and payment status are tracked separately.":article.includes("cancellation")?"Cancel from My Sessions. Refund eligibility is reviewed separately and a refund is not guaranteed.":article.includes("review")?"Open a completed session and choose Rate & Review.":article.includes("tutor")?"Open Profile and choose Apply as Tutor. An administrator reviews your application before activating Tutor capability.":"Find a tutor, choose Book Now, then select your session preferences and review them before proceeding."})}
                  type="button"
                  className="flex items-center gap-2 text-left text-xs font-medium text-[#075d34]"
                >
                  <FileText className="h-5 w-5 shrink-0 text-[#087542]" />
                  {article}
                </button>
              ))}
            </div>
            <button onClick={()=>setQuery("")}
              type="button"
              className="mt-3 h-9 w-full rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
            >
              View All Articles
            </button>
          </section>
        </aside>
      </div>
    </section>
  );
}
