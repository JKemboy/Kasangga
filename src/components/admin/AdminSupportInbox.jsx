import { useCallback, useEffect, useState } from "react";
import { Search, Send, UserRound } from "lucide-react";
import "../shared/booking-messages.css";
import "./admin-support-inbox.css";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  listSupportConversations,
  listSupportMessages,
  sendSupportMessage,
  setSupportConversationStatus,
} from "../../services/supportInbox.js";

const time = (value) => new Date(value).toLocaleString("en-PH", {
  timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
});

export default function AdminSupportInbox() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = threads.find((thread) => thread.id === selected);
  const filtered = threads.filter((thread) =>
    `${thread.subject} ${thread.category} ${thread.user?.first_name || ""} ${thread.user?.last_name || ""}`
      .toLowerCase().includes(query.toLowerCase()),
  );
  const refresh = useCallback(async () => {
    try {
      const rows = await listSupportConversations();
      setThreads(rows);
      setSelected((current) => current || rows[0]?.id || "");
      setError("");
    } catch (cause) { setError(cause.message); }
  }, []);
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 7000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    let alive = true;
    const load = async () => {
      try {
        const rows = await listSupportMessages(selected);
        if (alive) setMessages(rows);
      } catch (cause) { if (alive) setError(cause.message); }
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [selected]);
  async function reply(event) {
    event.preventDefault();
    if (!active || !draft.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await sendSupportMessage(active.id, user.id, draft);
      setDraft("");
      setMessages(await listSupportMessages(active.id));
      await refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  async function resolve() {
    if (!active) return;
    setBusy(true); setError("");
    try { await setSupportConversationStatus(active.id, active.status === "resolved" ? "open" : "resolved"); await refresh(); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  const fullName = (thread) => [thread?.user?.first_name, thread?.user?.last_name].filter(Boolean).join(" ") || "CampusTutor user";
  return (
    <div className="booking-chat tutor-booking-chat admin-support-chat">
      <h1>Messages</h1>
      <p className="chat-subtitle">Read and reply to support requests from learners and tutors.</p>
      <div className="chat-columns">
        <aside className="chat-sidebar">
          <h2 className="tutor-conversations-title">Conversations</h2>
          <div className="chat-search">
            <label><Search size={18} /><input type="search" aria-label="Search support conversations" placeholder="Search conversations..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          </div>
          <div className="chat-conversations">
            {filtered.map((thread) => <button key={thread.id} type="button" onClick={() => setSelected(thread.id)} className={`chat-person ${selected === thread.id ? "selected" : ""}`}>
              <span className="chat-avatar" aria-hidden="true">{fullName(thread).split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || <UserRound size={22} />}</span>
              <span className="chat-person-copy"><strong>{fullName(thread)}</strong><small>{thread.subject}</small><small className="chat-muted">{thread.category}</small></span>
              <span className="chat-person-meta"><small>{new Date(thread.updated_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</small><b className={thread.status === "resolved" ? "admin-support-resolved" : ""}>{thread.status}</b></span>
            </button>)}
            {!filtered.length && <p className="chat-empty">{threads.length ? "No matching conversations." : "No support requests yet."}</p>}
          </div>
        </aside>
        <section className="chat-main" aria-label="Support conversation">
          <header className="chat-header">
            <span className="chat-avatar" aria-hidden="true">{active ? fullName(active).split(/\s+/).slice(0, 2).map((part) => part[0]).join("") : <UserRound size={24} />}</span>
            <div className="chat-header-copy"><h2>{active ? fullName(active) : "Select a conversation"}</h2>{active && <><div className="chat-peer-status"><span>{active.status === "resolved" ? "Resolved" : "Support request"}</span></div><p>{active.subject}</p><small>{active.user?.csu_email} · {active.category}</small></>}</div>
            {active && <button type="button" disabled={busy} onClick={resolve} className="chat-outline admin-support-status">{active.status === "resolved" ? "Reopen" : "Resolve"}</button>}
          </header>
          {error && <p role="alert" className="chat-error">{error}</p>}
          <div className="chat-history" role="log" aria-label="Support messages">
            {messages.map((message) => { const mine = message.sender_id !== active?.user_id; return <article key={message.id} className={`chat-message ${mine ? "mine" : ""}`}>{!mine && <span className="chat-avatar" aria-hidden="true">{fullName(active).split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>}<div className="chat-bubble"><p>{message.message}</p><small>{mine ? "Admin" : fullName(active)} · {time(message.created_at)}</small></div>{mine && <span className="chat-avatar" aria-hidden="true">AD</span>}</article>; })}
            {!active && <p className="chat-empty">Select a support conversation to read and reply.</p>}
          </div>
          <form onSubmit={reply} className="chat-composer">
            <div className="chat-compose-row"><div className="chat-compose-input"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} placeholder="Type your message..." aria-label="Support reply" disabled={!active || busy} /></div><button className="chat-send" aria-label="Send reply" disabled={!active || busy || !draft.trim()}><Send size={22} /></button></div>
            <p className="tutor-chat-note admin-support-note">{active ? `Replying to ${fullName(active)} · ${active.user?.csu_email || ""}` : "Admin replies are delivered to the user’s support conversation."}</p>
          </form>
        </section>
      </div>
    </div>
  );
}
