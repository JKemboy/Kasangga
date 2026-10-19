// Support conversation: reads and sends learner support messages through the shared support inbox service.
import { useCallback, useEffect, useState } from "react";
import { Search, Send, UserRound } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import {
  createSupportConversation,
  listMySupportConversations,
  listSupportMessages,
  sendSupportMessage,
} from "../../../services/supportInbox.js";
import "../../shared/booking-messages.css";

const stamp = (value) => new Date(value).toLocaleString("en-PH", {
  timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
});

export default function LearnerSupportMessages() {
  const { user } = useAuth();
  const work = useLearnerWorkspace();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = threads.find((thread) => thread.id === selected);
  const filtered = threads.filter((thread) =>
    `${thread.subject} ${thread.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const refresh = useCallback(async () => {
    try {
      const rows = await listMySupportConversations();
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
  async function submit(event) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true); setError("");
    try {
      if (active) {
        await sendSupportMessage(active.id, user.id, draft);
        setMessages(await listSupportMessages(active.id));
      } else {
        const thread = await createSupportConversation({
          userId: user.id,
          subject: "CampusTutor Support",
          category: "General Support",
          message: draft,
        });
        setThreads((current) => [thread, ...current]);
        setSelected(thread.id);
        setMessages(await listSupportMessages(thread.id));
      }
      setDraft("");
      await refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  const initials = (value) => value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="booking-chat tutor-booking-chat learner-booking-chat">
      <h1>Messages</h1>
      <p className="chat-subtitle">Chat with CampusTutor support. Replies from the admin team appear here.</p>
      <div className="chat-columns">
        <aside className="chat-sidebar">
          <h2 className="tutor-conversations-title">Conversations</h2>
          <div className="chat-search"><label><Search size={18} /><input type="search" aria-label="Search conversations" placeholder="Search conversations..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
          <div className="chat-conversations">
            <button type="button" className={`chat-person ${!active ? "selected" : ""}`} onClick={() => setSelected("")}>
              <span className="chat-avatar">CT</span><span className="chat-person-copy"><strong>CampusTutor Support</strong><small>Start a support message</small><small className="chat-muted">Admin support</small></span>
            </button>
            {filtered.map((thread) => <button key={thread.id} type="button" className={`chat-person ${selected === thread.id ? "selected" : ""}`} onClick={() => setSelected(thread.id)}>
              <span className="chat-avatar">CT</span><span className="chat-person-copy"><strong>CampusTutor Support</strong><small>{thread.subject}</small><small className="chat-muted">{thread.status} · {thread.category}</small></span><span className="chat-person-meta"><small>{new Date(thread.updated_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</small></span>
            </button>)}
            {!filtered.length && threads.length > 0 && query && <p className="chat-empty">No matching conversations.</p>}
            <button type="button" className="chat-person" onClick={() => work.message({ name: "" })}>
              <span className="chat-avatar"><UserRound size={22} /></span><span className="chat-person-copy"><strong>Booking messages</strong><small>Return to tutor conversations</small></span>
            </button>
          </div>
        </aside>
        <section className="chat-main" aria-label="CampusTutor support chat">
          <header className="chat-header"><span className="chat-avatar">CT</span><div className="chat-header-copy"><h2>CampusTutor Support</h2><div className="chat-peer-status"><span>{active?.status === "resolved" ? "Resolved" : "Admin support"}</span></div><p>{active?.subject || "Send a message to contact the admin team."}</p><small>{active?.category || "Support messages are private to you and admin."}</small></div></header>
          {error && <p role="alert" className="chat-error">{error}</p>}
          <div className="chat-history" role="log" aria-label="Support messages">
            {messages.map((message) => { const mine = message.sender_id === user?.id; return <article key={message.id} className={`chat-message ${mine ? "mine" : ""}`}>{!mine && <span className="chat-avatar">CT</span>}<div className="chat-bubble"><p>{message.message}</p><small>{mine ? "You" : "CampusTutor Admin"} · {stamp(message.created_at)}</small></div>{mine && <span className="chat-avatar">{initials([user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ") || "You")}</span>}</article>; })}
            {!messages.length && <p className="chat-empty">{active ? "No messages in this conversation yet." : "Type a message below to contact support."}</p>}
          </div>
          <form onSubmit={submit} className="chat-composer"><div className="chat-compose-row"><div className="chat-compose-input"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} placeholder="Type your message..." aria-label="Message CampusTutor Support" disabled={busy} /></div><button className="chat-send" aria-label="Send message" disabled={busy || !draft.trim()}><Send size={22} /></button></div><p className="tutor-chat-note">Internal text messaging only · Admin support can see and reply to this conversation.</p></form>
        </section>
      </div>
    </div>
  );
}
