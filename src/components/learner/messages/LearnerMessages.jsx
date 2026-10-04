import "./messages.css";
import { Avatar } from "../../tutor/workspace/ui.jsx";
import { tutorProfile } from "../workspace/TutorProfile.jsx";
import ConversationMenu from "./ConversationMenu.jsx";
import { useState, useRef, useEffect } from "react";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import {
  Filter,
  Info,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Smile,
} from "lucide-react";

export default function LearnerMessages() {
  const work = useLearnerWorkspace();
  const [selected, setSelected] = useState(
      work.data.activeThread || work.data.threads.at(-1)?.name || "",
    ),
    [query, setQuery] = useState(""),
    [unread, setUnread] = useState(false),
    [draft, setDraft] = useState(""),
    [attachment, setAttachment] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (work.data.activeThread) setSelected(work.data.activeThread);
  }, [work.data.activeThread]);
  const profile = tutorProfile(
    work.data.saved.find((t) => t.name === selected) || {
      name: selected || "Tutor",
    },
  );
  const stamp = (m) => {
    if (!m?.at) return m?.time || "";
    const d = new Date(m.at);
    return Number.isNaN(d.getTime())
      ? m.at
      : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  const picker = useRef(null),
    bottom = useRef(null);
  const thread = work.data.threads.find((t) => t.name === selected);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [selected, thread?.messages.length]);
  function send() {
    if (!thread || (!draft.trim() && !attachment)) return;
    if (
      work.commit((d) => ({
        ...d,
        threads: d.threads.map((t) =>
          t.name === selected
            ? {
                ...t,
                messages: [
                  ...t.messages,
                  {
                    text: draft.trim(),
                    attachment,
                    mine: true,
                    at: new Date().toISOString(),
                    local: true,
                  },
                ],
              }
            : t,
        ),
      }))
    ) {
      setDraft("");
      setAttachment(null);
    }
  }
  return (
    <section className="learner-messages mx-auto flex h-[calc(100dvh-58px)] min-h-[440px] max-w-[1400px] flex-col px-3 py-2 lg:px-3">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Messages
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Communicate with your tutors and manage your conversations.
      </p>
      <div className="lm-panels mt-3 grid min-h-0 flex-1 grid-rows-[140px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,.03)] lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
        <aside
          className="flex min-h-0 flex-col overflow-y-auto border-b border-[#e5ebf1] lg:border-b-0 lg:border-r"
          aria-label="Conversations"
        >
          <div className="flex gap-2 border-b border-[#e5ebf1] p-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search conversations</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-9 w-full rounded-md border border-[#dbe3ed] pl-9 pr-3 text-xs outline-none focus:border-[#087542] focus:ring-2 focus:ring-[#087542]/15"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#405276]" />
            </label>
            <button
              type="button"
              aria-label="Filter conversations"
              aria-pressed={unread}
              onClick={() => setUnread(!unread)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#dbe3ed] text-[#173a9b] hover:bg-slate-50"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
          {work.data.threads
            .filter(
              (t) =>
                t.name.toLowerCase().includes(query.toLowerCase()) &&
                (!unread || t.unread),
            )
            .map((t) => (
              <button
                key={t.name}
                className={`lm-thread border-b p-3 text-left text-xs ${selected === t.name ? "is-selected" : ""}`}
                aria-pressed={selected === t.name}
                onClick={() => {
                  setSelected(t.name);
                  setDraft("");
                  setAttachment(null);
                  work.commit((d) => ({
                    ...d,
                    threads: d.threads.map((x) =>
                      x.name === t.name ? { ...x, unread: 0 } : x,
                    ),
                  }));
                }}
              >
                <Avatar name={t.name} />
                <div className="lm-thread-copy">
                  <div className="lm-thread-title">
                    <b>{t.name}</b>
                    <small>{stamp(t.messages.at(-1))}</small>
                  </div>
                  {t.unread > 0 && (
                    <span
                      className="float-right rounded-full bg-green-700 px-2 text-white"
                      aria-label={`${t.unread} unread messages`}
                    >
                      {t.unread}
                    </span>
                  )}
                  <p className="truncate text-slate-500">
                    {t.messages.at(-1)?.text || "No messages yet"}
                  </p>
                </div>
              </button>
            ))}
          {!work.data.threads.length && (
            <p className="p-3 text-center text-xs text-slate-400">
              No conversations yet.
            </p>
          )}
        </aside>
        <section
          className="flex min-h-0 min-w-0 flex-col"
          aria-label="Chat conversation"
        >
          <div className="flex min-h-16 shrink-0 items-center border-b border-[#e5ebf1] px-3">
            {thread && <Avatar name={thread.name} />}
            <div className="ml-3 lm-header-copy">
              <p className="text-sm font-semibold text-slate-900">
                {thread?.name || "Select a conversation"}
              </p>
              {thread && (
                <>
                  <div className="lm-presence">
                    {typeof profile.online === "boolean" && (
                      <span>{profile.online ? "Online" : "Offline"}</span>
                    )}
                    {profile.verified && (
                      <span className="lm-verified">Verified Tutor</span>
                    )}
                  </div>
                  <p className="text-xs text-blue-700">
                    {profile.degree || "Tutor conversation"}
                    {profile.subjects ? " | " + profile.subjects : ""}
                  </p>
                </>
              )}
            </div>
            {thread && (
              <ConversationMenu key={thread.name} work={work} thread={thread} />
            )}
          </div>
          <div className="lm-history min-h-0 flex-1 overflow-y-auto px-3 text-xs">
            {thread ? (
              <div className="w-full space-y-2 py-3 text-left">
                {thread.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`lm-message ${m.mine ? "mine" : "received"}`}
                  >
                    {!m.mine && <Avatar name={thread.name} />}
                    <div className="lm-bubble">
                      <p className="whitespace-pre-wrap break-words">
                        {m.text}
                      </p>
                      {m.attachment && <p>Attachment: {m.attachment.name}</p>}
                      <small>
                        {stamp(m)}
                        {m.local ? " - Saved locally" : ""}
                      </small>
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
            ) : (
              <p>Choose a conversation to start messaging.</p>
            )}
          </div>
          <div className="shrink-0 border-t border-[#e5ebf1] p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Attach file"
                disabled={!thread}
                onClick={() => picker.current?.click()}
                className="grid h-9 w-6 shrink-0 place-items-center text-slate-400"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="relative min-w-0 flex-1">
                <input
                  disabled={!thread}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      send();
                    }
                  }}
                  maxLength={3000}
                  placeholder="Type your message..."
                  className="h-9 w-full rounded-md border border-[#dbe3ed] bg-white px-4 pr-11 text-xs text-slate-800 disabled:cursor-not-allowed"
                />
                <button
                  aria-label="Add smile emoji"
                  disabled={!thread}
                  onClick={() => setDraft((d) => d + " \u{1F642}")}
                  className="absolute right-3 top-2.5"
                >
                  <Smile className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <button
                disabled={!thread || (!draft.trim() && !attachment)}
                onClick={send}
                type="button"
                className="flex h-9 w-14 shrink-0 items-center justify-center gap-1 rounded-md bg-[#087542] text-xs font-semibold text-white disabled:opacity-45"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
            <input
              hidden
              ref={picker}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024)
                  return setError("Choose a file under 5 MB.");
                setAttachment({ name: f.name, type: f.type, size: f.size });
                setError("");
              }}
            />
            {attachment && (
              <p className="mt-2 text-xs">
                {attachment.name}{" "}
                <button onClick={() => setAttachment(null)}>
                  Remove attachment
                </button>
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="mt-2 flex gap-2 rounded-md bg-[#effcf5] px-3 py-2 text-xs text-[#53627b]">
              <Info className="h-4 w-4 shrink-0 text-[#087542]" />
              <p>
                Keep your communication within CampusTutor for your safety.
                <br />
                Do not share personal contact information.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
