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
      initialSession?.lifecycle === "Completed"
        ? "Done"
        : ["Upcoming", "Ongoing", "Completed", "Done"].includes(args.tab)
          ? args.tab === "Completed"
            ? "Done"
            : args.tab
          : "Upcoming",
    ),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(initialSession || null),
    [action, setAction] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const now = new Date();
  const lifecycleFor = (session) => {
    if (session.status === "Completed") return "Completed";
    const start = new Date(session.startAt);
    const end = new Date(session.endAt);
    return now < start
      ? "Upcoming"
      : now < end
        ? "Ongoing"
        : "Awaiting Completion";
  };
  const rows = data.sessions.filter(
    (s) =>
      (!args.serviceId || s.serviceId === String(args.serviceId)) &&
      s.payment === "Paid" &&
      (tab === "Done"
        ? lifecycleFor(s) === "Completed"
        : lifecycleFor(s) === tab) &&
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
        <button
          type="button"
          onClick={refreshSessions}
          disabled={sessionsLoading}
        >
          Refresh sessions
        </button>
        <label className="session-search-box">
          <Search size={17} />
          <input
            aria-label="Search sessions"
            className={input}
            placeholder="Search sessions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
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
        {["Upcoming", "Ongoing", "Done"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <SessionCards
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
