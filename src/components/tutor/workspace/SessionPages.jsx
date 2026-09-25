import { sessionAction, meetingUrl } from "./sessionActions.js";
import { Search, ListFilter, ChevronDown, Info } from "lucide-react";
import SessionCards from "./SessionCards.jsx";
import { useState } from "react";
import { money, allocation, hour, time } from "./data.js";
import {
  Heading,
  Panel,
  Table,
  Pager,
  Avatar,
  Badge,
  Empty,
  Modal,
  Field,
  button,
  primary,
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
              <Avatar name={s.learner} />
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
export function Sessions({ data, update, go, args = {} }) {
  const initialSession = data.sessions.find((s) => s.id === args.sessionId);
  const [query, setQuery] = useState(args.query || ""),
    [type, setType] = useState("All"),
    [tab, setTab] = useState(
      initialSession &&
        ["Completed", "Cancelled"].includes(initialSession.status)
        ? initialSession.status
        : ["Upcoming", "Completed", "Cancelled"].includes(args.tab)
          ? args.tab
          : "Upcoming",
    ),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(initialSession || null),
    [action, setAction] = useState(""),
    [feedback, setFeedback] = useState("");
  const rows = data.sessions.filter(
    (s) =>
      (tab === "Upcoming"
        ? ["Confirmed", "Pending"].includes(s.status)
        : s.status === tab) &&
      (type === "All" || s.type === type) &&
      matches(s, query),
  );
  function submit(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const next = sessionAction(data, selected.id, action, {...form, acknowledged:form.acknowledged === 'on'});
      if (update(() => next) === false) throw new Error('Could not save. Please try again.');
      if(action==='cancel') {setTab('Cancelled');setSelected(null);}
      else {setSelected(next.sessions.find(s=>s.id===selected.id));setFeedback(action==='reschedule'?'Reschedule request saved locally. The original time stays until accepted.':'Report saved locally for review.');}
      setAction('');
    } catch(error) {setFeedback(error.message);}
  }
  return (
    <div className="sessions-reference">
      <Heading
        title="My Sessions"
        subtitle="View and manage your tutoring sessions."
      />
      <div className="session-search-row">
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
        {["Upcoming", "Completed", "Cancelled"].map((t) => (
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
          setFeedback("");
        }}
        onMessage={(s) => go("messages", { learner: s.learner })}
        onMeeting={(s) => {
          setSelected(s);
          setAction("meeting");
          setFeedback("");
        }}
      />
      <Empty show={!rows.length} />
      {rows.length > 5 && (
        <Pager count={rows.length} page={page} setPage={setPage} />
      )}
      <div className="session-footer-note">
        <Info size={19} />
        <span>All times use Asia/Manila (GMT+08:00).</span>
        <span>
          Cancellation does not automatically guarantee a refund. Refund
          eligibility is reviewed separately under CampusTutor policy.
        </span>
      </div>
      {selected && (
        <Modal title={action === "cancel" ? "Cancel Session" : action === "reschedule" ? "Request Reschedule" : action === "incident" ? "Report an Issue" : action === "meeting" ? "Open External Meeting" : "Session Details"} subtitle={`${selected.learner} ? ${selected.service}`} onClose={() => { setSelected(null); setAction(""); }}>
          {!action && <>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(selected)
              .filter(([k]) => !["id"].includes(k))
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold capitalize">{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
          </dl>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className={button}
              onClick={() => go("messages", { learner: selected.learner })}
            >
              Message Learner
            </button>
            {["Confirmed", "Pending"].includes(selected.status) && (
              <>
                <button
                  className={button}
                  onClick={() => setAction("reschedule")}
                >
                  Request Reschedule
                </button>
                <button className={button} onClick={() => setAction("cancel")}>
                  Cancel Session
                </button>
              </>
            )}
            <button className={button} onClick={() => setAction("incident")}>
              Report an Issue
            </button>
          </div>
          </>}
          {action === "meeting" && <div className="space-y-3 text-sm"><p>This meeting runs on {selected.provider || "an external platform"}, outside CampusTutor.</p>{meetingUrl(selected.meetingUrl || selected.link) ? <a className={primary} href={meetingUrl(selected.meetingUrl || selected.link)} target="_blank" rel="noopener noreferrer">Open Meeting</a> : <p role="status">No meeting link has been provided. Contact the learner or update the session meeting information.</p>}<button className={button} onClick={()=>setAction("")}>Back</button></div>}
          {action && action !== "meeting" && (
            <form onSubmit={submit} className="mt-2 space-y-3">
              <p className="text-xs">
                {action === "cancel"
                  ? "Cancel this session in the local demo? Refund eligibility is reviewed separately."
                  : "Prepare a local request draft. Review and submission services are not connected."}
              </p>
              {action === "reschedule" && (
                <>
                  <Field
                    label="Requested date"
                    name="date"
                    type="date"
                    required
                  />
                  <Field
                    label="Requested time"
                    name="time"
                    type="time"
                    required
                  />
                </>
              )}
              {action === "incident" && <Field label="Incident type"><select name="incidentType" className={input} required><option value="">Select a type</option>{["No-show","Inappropriate behavior","Harassment","Payment concern","Technical issue","Other"].map(t=><option key={t}>{t}</option>)}</select></Field>}
              {action === "cancel" && <label className="flex gap-2 text-xs"><input name="acknowledged" type="checkbox" required/>I understand that cancellation does not automatically guarantee a refund.</label>}
              <Field
                label="Reason / Details"
                name="reason"
                required
                maxLength={2000}
              />
              <button className={action === "cancel" ? "tutor-danger-button" : primary}>
                {action === "cancel" ? "Confirm Cancellation" : "Save Draft"}
              </button>
              <button
                type="button"
                className={button}
                onClick={() => setAction("")}
              >
                Back
              </button>
            </form>
          )}
          <p role="status" className="mt-2 text-xs">
            {feedback}
          </p>
        </Modal>
      )}
    </div>
  );
}
export { default as Earnings } from "./Earnings.jsx";
export { default as Overview } from "./Overview.jsx";
