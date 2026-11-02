import { useRef, useState } from "react";
import {
  ArrowLeft,
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
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { Modal, button, primary } from "../../tutor/workspace/ui.jsx";
import { filterHelpArticles, helpArticles } from "./helpArticles.js";
const categories = [
  [
    Rocket,
    "Getting Started",
    "Learn the basics of using Kasangga as a learner.",
  ],
  [
    Search,
    "Finding a Tutor",
    "How to search, filter, and choose the right tutor.",
  ],
  [
    CalendarDays,
    "Booking Sessions",
    "How to book, cancel, or manage your tutoring sessions.",
  ],
  [
    CircleDollarSign,
    "Payments",
    "Learn about GCash payments via PayMongo, transaction status, and receipts.",
  ],
  [
    MessageCircle,
    "Messages",
    "Learn how to message tutors and manage conversations.",
  ],
  [
    UserRound,
    "Tutor Application",
    "Information for students who want to become tutors.",
  ],
  [Star, "Reviews", "How reviews work and how to leave feedback."],
  [
    ShieldCheck,
    "Account & Security",
    "Manage your account, password, and security settings.",
  ],
];
const categoryStyles = [
  "bg-[#e5f5eb] text-[#006838]",
  "bg-[#e5f5eb] text-[#006838]",
  "bg-[#e7efff] text-[#1762ed]",
  "bg-[#fff2d8] text-[#e89b00]",
  "bg-[#fff7df] text-[#e89b00]",
  "bg-[#eee8ff] text-[#7744ed]",
  "bg-[#fce6f4] text-[#ed2996]",
  "bg-[#edf0f3] text-[#536170]",
];
const popular = [
  "book-session",
  "payment",
  "cancel-session",
  "review",
  "apply-tutor",
];
const panel = "rounded-lg border border-[#e1e7ef] bg-white p-4";
export default function LearnerHelpSupport() {
  const work = useLearnerWorkspace();
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState(false);
  const [category, setCategory] = useState("All Categories");
  const [article, setArticle] = useState(null);
  const [contact, setContact] = useState(false);
  const resultsHeading = useRef(null);
  const results = filterHelpArticles(helpArticles, query, category);
  const showArticles = library || !!query.trim();
  function browse(nextCategory = "All Categories") {
    setCategory(nextCategory);
    setLibrary(true);
    setQuery("");
    window.requestAnimationFrame(() => resultsHeading.current?.focus());
  }
  function go(view) {
    setArticle(null);
    setContact(false);
    if (view === "support") work.message({ name: "Kasangga Support" });
    else work.go(view);
  }
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Help &amp; Support
      </h1>
      <p className="mt-1 text-xs text-[#566584]">
        Find answers to common questions or contact our support team.
      </p>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)] xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <div className="min-w-0">
          <label className="relative block">
            <span className="sr-only">Search help articles</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCategory("All Categories");
              }}
              placeholder="Search help articles, e.g. payment or cancellation..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-xs focus:outline-green-700"
            />
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          </label>
          {showArticles ? (
            <>
              <button
                type="button"
                className="mb-6 mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#006b3c] hover:underline"
                onClick={() => {
                  setLibrary(false);
                  setQuery("");
                  setCategory("All Categories");
                }}
              >
                <ArrowLeft size={15} />
                All help categories
              </button>
              <h2
                ref={resultsHeading}
                tabIndex={-1}
                className="mb-4 text-base font-bold"
              >
                {query.trim()
                  ? "Search results"
                  : category === "All Categories"
                    ? "All articles"
                    : category}
              </h2>
              <p role="status" aria-live="polite" className="sr-only">
                {results.length} articles found
              </p>
              <div className="rounded-xl border border-[#e1e7ef] bg-white px-4 py-2">
                {results.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setArticle(item)}
                    className="group flex min-h-10 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-2 text-left hover:bg-green-50 focus-visible:outline-green-700 sm:flex-nowrap"
                  >
                    <FileText className="h-[18px] w-[18px] shrink-0 text-[#006b3c]" />
                    <span className="min-w-0 flex-1 text-sm text-[#0645d9] group-hover:underline">
                      {item.title}
                    </span>
                    <span className="ml-auto text-xs text-[#728093] sm:shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
              {!results.length && (
                <div className={panel + " text-sm text-slate-600"}>
                  <p>
                    No matching articles. Try a subject such as booking, GCash,
                    profile or report.
                  </p>
                  <button
                    type="button"
                    className={button + " mt-3"}
                    onClick={() => browse()}
                  >
                    Reset filters and view all articles
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="mb-3 mt-4 text-base font-bold">Help Categories</h2>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {categories.map(([Icon, name, description], index) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => browse(name)}
                    className={
                      panel +
                      " flex min-h-[104px] items-center gap-4 text-left hover:border-green-600"
                    }
                  >
                    <span
                      className={
                        "grid h-16 w-16 shrink-0 place-items-center rounded-full " +
                        categoryStyles[index]
                      }
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <span>
                      <strong className="block text-sm">{name}</strong>
                      <span className="mt-1 block text-xs leading-5 text-[#435d7e]">
                        {description}
                      </span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 flex gap-3 rounded-lg bg-blue-50 p-4 text-xs">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h2 className="font-semibold">Safety Reminder</h2>
              <p className="mt-2 leading-5 text-slate-600">
                Keep bookings and payments within Kasangga and its PayMongo
                checkout. Join meetings only from the confirmed session. Never
                share passwords, OTPs or GCash MPINs. Use Report an Issue on the
                affected session for suspicious activity.
              </p>
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <section className="rounded-xl border border-[#dfede3] bg-[#f2faf5] px-5 py-6 text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-green-800">
              <Headphones className="h-7 w-7" />
            </span>
            <h2 className="mt-3 font-bold">Need More Help?</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Can't find what you're looking for? Our support team is here to
              help.
            </p>
            <button
              type="button"
              onClick={() => setContact(true)}
              className={
                primary +
                " mt-4 flex min-h-11 w-full items-center justify-center gap-2"
              }
            >
              <MessageCircle size={16} /> Contact Support
            </button>
          </section>
          <section className={panel}>
            <h2 className="font-semibold">Popular Articles</h2>
            <div className="mt-3 space-y-3">
              {popular.map((id) => {
                const item = helpArticles.find((entry) => entry.id === id);
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setArticle(item)}
                    className="flex items-start gap-3 text-left text-sm text-[#0645d9] hover:underline"
                  >
                    <FileText className="h-[18px] w-[18px] shrink-0 text-green-800" />
                    {item.title}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => browse()}
              className={button + " mt-5 min-h-11 w-full"}
            >
              View All Articles
            </button>
          </section>
        </aside>
      </div>
      {article && (
        <Modal
          title={article.title}
          subtitle={article.category}
          onClose={() => setArticle(null)}
          footer={
            <>
              <button
                type="button"
                className={button}
                onClick={() => setArticle(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={primary}
                onClick={() => go(article.view)}
              >
                {article.action}
              </button>
            </>
          }
        >
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
            {article.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="mt-4 border-t pt-3 text-xs">
            <strong>Related articles</strong>
            {helpArticles
              .filter(
                (item) =>
                  item.category === article.category && item.id !== article.id,
              )
              .map((item) => (
                <button
                  type="button"
                  className="mt-2 block text-left text-green-800 underline"
                  key={item.id}
                  onClick={() => setArticle(item)}
                >
                  {item.title}
                </button>
              ))}
          </div>
        </Modal>
      )}
      {contact && (
        <Modal title="Contact Support" onClose={() => setContact(false)}>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold">
                Session, payment or conduct issue
              </h3>
              <p className="mt-1 text-slate-600">
                Open the affected session and choose Report an Issue. Include
                the booking reference, a clear description and the requested
                evidence. Reports are submitted to authorized LCO for review.
              </p>
              <button
                type="button"
                className={primary + " mt-2"}
                onClick={() => go("sessions")}
              >
                Open My Sessions
              </button>
            </section>
            <section>
              <h3 className="font-semibold">
                Schedule or meeting-link question
              </h3>
              <p className="mt-1 text-slate-600">
                Message your tutor through the relevant booking conversation.
              </p>
              <button
                type="button"
                className={button + " mt-2"}
                onClick={() => go("messages")}
              >
                Open Messages
              </button>
            </section>
            <section>
              <h3 className="font-semibold">Account or technical help</h3>
              <p className="mt-1 text-slate-600">
                Open Kasangga Support to send a private message to the LCO
                support team. Include the page, what happened and any booking
                reference. Never send passwords, OTPs or GCash MPINs.
              </p>
              <button
                type="button"
                className={primary + " mt-2"}
                onClick={() => {
                  setContact(false);
                  work.message({ name: "Kasangga Support" });
                }}
              >
                Message Kasangga Support
              </button>
            </section>
            <button
              type="button"
              className={button}
              onClick={() => setContact(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
