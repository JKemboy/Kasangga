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
    "Set up your profile and explore your dashboard.",
  ],
  [
    Search,
    "Finding a Tutor",
    "Search, filter, compare and save tutor services.",
  ],
  [
    CalendarDays,
    "Booking Sessions",
    "Book, join and manage your tutoring sessions.",
  ],
  [
    CircleDollarSign,
    "Payments",
    "GCash checkout, verification and payment records.",
  ],
  [MessageCircle, "Messages", "Find the conversation for your booking."],
  [
    UserRound,
    "Tutor Application",
    "Requirements, documents and application status.",
  ],
  [Star, "Reviews", "Rate completed sessions and manage your feedback."],
  [
    ShieldCheck,
    "Account & Security",
    "Profile changes, passwords and issue reports.",
  ],
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
        Find step-by-step answers about your account, tutors, sessions and
        payments.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                  ref={resultsHeading}
                  tabIndex={-1}
                  className="text-base font-bold"
                >
                  {query.trim() ? "Search Results" : "All Help Articles"}
                </h2>
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    setLibrary(false);
                    setQuery("");
                    setCategory("All Categories");
                  }}
                >
                  <ArrowLeft className="mr-1 inline h-3 w-3" />
                  Help Categories
                </button>
              </div>
              <label className="mt-3 block text-xs font-medium">
                Filter by category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="ml-2 rounded border border-slate-200 bg-white p-2"
                >
                  <option>All Categories</option>
                  {categories.map(([, name]) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <p
                role="status"
                aria-live="polite"
                className="my-3 text-xs text-slate-500"
              >
                {results.length} article{results.length === 1 ? "" : "s"} found
              </p>
              <div className="space-y-2">
                {results.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setArticle(item)}
                    className={
                      panel +
                      " flex w-full items-start gap-3 text-left hover:border-green-600"
                    }
                  >
                    <FileText className="mt-1 h-5 w-5 shrink-0 text-green-800" />
                    <span>
                      <small className="text-green-800">{item.category}</small>
                      <strong className="mt-1 block text-sm">
                        {item.title}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.steps[0]}
                      </span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
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
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map(([Icon, name, description]) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => browse(name)}
                    className={
                      panel +
                      " flex items-center gap-3 text-left hover:border-green-600"
                    }
                  >
                    <span className="rounded-full bg-green-50 p-3 text-green-800">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <strong className="block text-sm">{name}</strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {description}
                      </span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
              <section className={panel + " mt-4"}>
                <h2 className="mb-2 font-semibold">
                  Frequently Asked Questions
                </h2>
                {[
                  "pending-payment",
                  "meeting",
                  "application-status",
                  "account-security",
                ].map((id) => {
                  const item = helpArticles.find((entry) => entry.id === id);
                  return (
                    <details key={id} className="border-t py-3 text-xs">
                      <summary className="cursor-pointer font-semibold text-green-900">
                        {item.title}
                      </summary>
                      <p className="mt-2 leading-5 text-slate-600">
                        {item.steps[0]}
                      </p>
                      <button
                        className={button + " mt-2"}
                        type="button"
                        onClick={() => setArticle(item)}
                      >
                        Read full article
                      </button>
                    </details>
                  );
                })}
              </section>
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
          <section className="rounded-lg bg-green-50 p-4 text-center">
            <Headphones className="mx-auto h-8 w-8 text-green-800" />
            <h2 className="mt-3 font-bold">Need More Help?</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Choose the help route for your booking, payment or account
              concern.
            </p>
            <button
              type="button"
              onClick={() => setContact(true)}
              className={primary + " mt-3 w-full"}
            >
              Contact Support
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
                    className="flex items-start gap-2 text-left text-xs text-green-900 hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {item.title}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => browse()}
              className={button + " mt-4 w-full"}
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
                evidence. Reports are submitted to authorized Admin for review.
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
                Open Kasangga Support to send a private message to the Admin
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
              <button
                type="button"
                className={button + " mt-2 block"}
                onClick={() => go("settings")}
              >
                Open Settings
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
