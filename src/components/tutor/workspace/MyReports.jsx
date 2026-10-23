import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, ExternalLink, RefreshCw } from "lucide-react";
import { listMyReports } from "../../../services/myReports.js";
import { button, Heading } from "./ui.jsx";
const label = (value) => String(value || "Not available").replaceAll("_", " ");
const date = (value) =>
  value
    ? new Date(value).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available";
export default function MyReports({ go, args = {} }) {
  const [reports, setReports] = useState({ created: [], received: [] });
  const [tab, setTab] = useState(
    args.tab === "received" ? "received" : "created",
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await listMyReports();
      if (current === request.current) setReports(result);
    } catch (error) {
      if (current === request.current) setError(error.message);
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("campustutor:sessions-changed", refresh);
    return () => {
      request.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("campustutor:sessions-changed", refresh);
    };
  }, [refresh]);
  useEffect(() => {
    setTab(args.tab === "received" ? "received" : "created");
  }, [args.tab]);
  const rows = reports[tab].filter((report) =>
    [
      report.report_id,
      report.booking_id,
      report.incident_type,
      report.report_status,
      report.description,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="space-y-4">
      <Heading
        title="My Reports"
        subtitle="View the session reports you created and reports received about your sessions."
      />
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex gap-2" aria-label="Report type">
          {[
            ["created", "Reports Created"],
            ["received", "Reports Received"],
          ].map(([key, text]) => (
            <button
              type="button"
              key={key}
              aria-pressed={tab === key}
              className={button + (tab === key ? " bg-green-50" : "")}
              onClick={() => setTab(key)}
            >
              {text} ({reports[key].length})
            </button>
          ))}
        </nav>
        <button
          type="button"
          className={button + " ml-auto"}
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={14} className="mr-1 inline" />
          Refresh
        </button>
      </div>
      <label className="block">
        <span className="sr-only">Search reports</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search report ID, booking, type or status..."
          className="w-full rounded-md border bg-white p-2 text-sm"
        />
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          <button className="ml-2 underline" type="button" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm">
          Loading your reports...
        </p>
      )}
      {!loading && !error && !rows.length && (
        <p
          role="status"
          className="rounded-lg border bg-white p-5 text-sm text-slate-500"
        >
          {query
            ? "No reports match your search."
            : tab === "created"
              ? "You have not created any reports yet."
              : "No reports received are available to your account."}
        </p>
      )}
      {!error &&
        rows.map((report) => (
          <article
            key={report.report_id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">
                <Flag size={16} className="mr-2 inline text-green-800" />
                Report #{report.report_id}: {report.incident_type}
              </h2>
              <span className="rounded bg-green-50 px-2 py-1 text-xs capitalize text-green-800">
                {label(report.report_status)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Booking #{report.booking_id || "Not available"} -{" "}
              {date(report.submitted_at)}
            </p>
            <details>
              <summary className="cursor-pointer font-medium text-green-800">
                View report details
              </summary>
              <p className="mt-3 whitespace-pre-wrap break-words">
                {report.description}
              </p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt>Priority</dt>
                <dd className="capitalize">{label(report.priority)}</dd>
                <dt>OSAS Referral</dt>
                <dd className="capitalize">
                  {label(report.osas_referral_status)}
                </dd>
                {report.resolved_at && (
                  <>
                    <dt>Resolved</dt>
                    <dd>{date(report.resolved_at)}</dd>
                  </>
                )}
              </dl>
            </details>
            {report.booking_id && (
              <button
                type="button"
                className={button}
                onClick={() =>
                  go("sessions", { sessionId: String(report.booking_id) })
                }
              >
                <ExternalLink size={14} className="mr-1 inline" />
                View Session
              </button>
            )}
          </article>
        ))}
      <p className="text-xs text-slate-500">
        To create a report, open the affected session and choose Report an
        Issue. Reports are reviewed by authorized Admin; receiving a report does
        not establish a finding.
      </p>
    </section>
  );
}
