// Tutor My Sessions: groups active, completed, and cancelled bookings by lifecycle.
import { sessionLifecycle } from "../../../services/sessionLifecycle.js";
const SESSION_TABS = ["Upcoming", "Ongoing", "Completed", "Cancelled"];
import SessionDetails from "./SessionDetails.jsx";
import { Search, ListFilter, ChevronDown, Info } from "lucide-react";
import SessionCards from "./SessionCards.jsx";
import { useEffect, useState } from "react";
import { money, hour, time } from "./data.js";
import {
  Heading,
  Table,
  Pager,
  Avatar,
  Badge,
  Empty,
  input,
  matches,
} from "./ui.jsx";
export function SessionTable({ rows, actions }) {
  return (
    <Table
      headers={[
        "Learner",
        "Service / Subject",
        "Specific Topic",
        "Date",
        "Time Range",
        "Duration",
        "Session Type",
        "Amount",
        "Booking Status",
        "Payment Status",
        ...(actions ? ["Actions"] : []),
      ]}
    >
      {rows.map((s) => (
        <tr key={s.id}>
          {[
            <div className="flex items-center gap-2">
              <Avatar
                name={s.learner}
                userId={s.learnerUserId || s.learnerId}
              />
              {s.learner}
            </div>,
            s.service,
            s.topic,
            s.date,
            `${time(hour(s.start))} – ${time(hour(s.end))}`,
            `${Math.round((hour(s.end) - hour(s.start)) * 60)} min`,
            `${s.type} · ${s.provider}`,
            money(s.amount),
            <Badge>{s.status}</Badge>,
            <Badge>{s.payment}</Badge>,
            ...(actions ? [actions(s)] : []),
          ].map((v, i) => (
            <td key={i} className="px-2 py-1.5">
              {v}
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
}
export function Sessions({
  data,
  update,
  go,
  args = {},
  sessionsLoading,
  sessionsError,
  refreshSessions,
}) {
  const initialSession = data.sessions.find((s) => s.id === args.sessionId);
  const [query, setQuery] = useState(args.query || ""),
    [type, setType] = useState("All"),
    [tab, setTab] = useState(
      ["Completed", "Cancelled"].includes(initialSession?.lifecycle)
        ? initialSession.lifecycle
        : [...SESSION_TABS, "Done"].includes(args.tab)
          ? args.tab === "Done"
            ? "Completed"
            : args.tab
          : "Upcoming",
    ),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(
      args.highlight ? null : initialSession || null,
    ),
    [action, setAction] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const now = new Date();
  const records = data.sessions.map((session) => ({
    ...session,
    lifecycle: sessionLifecycle(session, now),
  }));
  useEffect(() => {
    if (!args.highlight || !args.sessionId) return;
    const target = records.find(
      (record) => String(record.id) === String(args.sessionId),
    );
    if (!target) return;
    const nextTab =
      target.lifecycle === "Awaiting Completion" ? "Ongoing" : target.lifecycle;
    if (SESSION_TABS.includes(nextTab)) setTab(nextTab);
    setQuery("");
    setType("All");
    const peers = records.filter(
      (record) =>
        record.lifecycle === target.lifecycle &&
        (record.lifecycle === "Cancelled" || record.payment === "Paid"),
    );
    setPage(
      Math.floor(
        Math.max(
          0,
          peers.findIndex((record) => record.id === target.id),
        ) / 5,
      ) + 1,
    );
  }, [args.highlight, args.sessionId, data.sessions]);
  const inTab = (session, name) =>
    session.lifecycle === name ||
    (name === "Ongoing" && session.lifecycle === "Awaiting Completion");
  const rows = records.filter(
    (s) =>
      (!args.serviceId || s.serviceId === String(args.serviceId)) &&
      (s.lifecycle === "Cancelled" || s.payment === "Paid") &&
      inTab(s, tab) &&
      (type === "All" || s.type === type) &&
      matches(s, query),
  );
  return (
    <div className="sessions-reference">
      <Heading
        title="My Sessions"
        subtitle="View and manage your tutoring sessions."
      />
      <div className="session-search-row">
        <label className="session-filter">
          <ListFilter size={17} />
          <select
            aria-label="Session type"
            className={input}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Session Types</option>
            <option>Online</option>
            <option>In-person</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      <nav className="session-tabs" aria-label="Session status">
        {SESSION_TABS.map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
          >
            {t} (
            {
              records.filter(
                (session) =>
                  (session.lifecycle === "Cancelled" ||
                    session.payment === "Paid") &&
                  (!args.serviceId ||
                    session.serviceId === String(args.serviceId)) &&
                  inTab(session, t),
              ).length
            }
            )
          </button>
        ))}
      </nav>
      <SessionCards
        highlightId={args.highlight ? args.sessionId : null}
        rows={rows.slice((page - 1) * 5, page * 5)}
        onDetails={(s) => {
          setSelected(s);
          setAction("");
        }}
        onMessage={(s) => go("messages", { learner: s.learner })}
        onMeeting={(s) => {
          setSelected(s);
          setAction("meeting");
        }}
        onAction={(s, nextAction) => {
          setSelected(s);
          setAction(nextAction);
        }}
      />
      {sessionsError && (
        <p role="alert" className="text-sm text-red-700">
          {sessionsError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={refreshSessions}
          >
            Retry
          </button>
        </p>
      )}
      {sessionsLoading && <p role="status">Loading sessions...</p>}
      <Empty show={!sessionsLoading && !sessionsError && !rows.length} />
      {rows.length > 5 && (
        <Pager count={rows.length} page={page} setPage={setPage} />
      )}
      <div className="session-footer-note">
        <Info size={19} />
        <span>All times use Asia/Manila (GMT+08:00).</span>
      </div>
      {selected && (
        <SessionDetails
          key={selected.id + action}
          data={data}
          go={go}
          sessionId={selected.id}
          initialAction={action}
          refreshSessions={refreshSessions}
          onClose={() => {
            setSelected(null);
            setAction("");
          }}
        />
      )}
    </div>
  );
}
export { default as Earnings } from "./Earnings.jsx";
export { default as Overview } from "./Overview.jsx";
