import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck,
  ExternalLink,
  Send,
  Search,
  SlidersHorizontal,
  MoreVertical,
  CalendarDays,
  Mail,
  Flag,
  Info,
  Smile,
  CheckCheck,
  UserRound,
} from "lucide-react";
import ChatDetails from "./ChatDetails.jsx";
import "./booking-messages.css";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  chatRequest,
  listChats,
  readMessages,
  sendMessage,
} from "../../services/bookingMessages.js";

const stamp = (value) =>
  new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export default function BookingMessages({
  role,
  initialName = "",
  initialBookingId = "",
  onProfile,
}) {
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [panel, setPanel] = useState(""),
    [unreadOnly, setUnreadOnly] = useState(false),
    [emojis, setEmojis] = useState(false);
  const pauseSelection = useRef(false);
  async function markUnread() {
    try {
      pauseSelection.current = true;
      active.current = "";
      setSelected("");
      await chatRequest("mark_booking_chat_unread", {
        p_booking_id: chat.booking_id,
      });
      setChats(await listChats(role));
    } catch (e) {
      setError(e.message);
    }
  }

  const [chats, setChats] = useState([]),
    [selected, setSelected] = useState("");
  const activeBookingIds = useMemo(
    () => new Set(chats.map((chat) => String(chat.booking_id))),
    [chats],
  );
  const [messages, setMessages] = useState([]),
    [draft, setDraft] = useState("");
  const [query, setQuery] = useState(""),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false);
  const [reading, setReading] = useState(false),
    [retry, setRetry] = useState(0);
  const bottom = useRef(null),
    busy = useRef(false),
    active = useRef("");
  active.current = selected;
  const chat = chats.find((c) => String(c.booking_id) === selected);
  const canSend = chat?.can_send === true;
  useEffect(() => {
    let live = true,
      timer;
    setChats([]);
    setSelected("");
    setMessages([]);
    setLoading(true);
    setError("");
    async function load() {
      try {
        const rows = await listChats(role);
        if (!live) return;
        setChats(rows || []);
        setSelected(
          (current) =>
            current ||
            (pauseSelection.current
              ? ""
              : initialBookingId &&
                  activeBookingIds?.has(String(initialBookingId))
                ? String(
                    rows?.find(
                      (c) =>
                        String(c.booking_id) === String(initialBookingId) ||
                        c.booking_ids?.some(
                          (id) => String(id) === String(initialBookingId),
                        ),
                    )?.booking_id || "",
                  )
                : ""),
        );
      } catch (e) {
        if (live) setError(e.message);
      } finally {
        if (live) {
          setLoading(false);
          timer = setTimeout(load, 5000);
        }
      }
    }
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [user?.id, role, retry, initialName, initialBookingId]);
  useEffect(() => {
    if (activeBookingIds === null) return;
    if (selected && !activeBookingIds.has(selected)) {
      setSelected("");
      setMessages([]);
      return;
    }
    if (!selected && !pauseSelection.current) {
      const match = chats.find(
        (item) =>
          activeBookingIds.has(String(item.booking_id)) &&
          (initialBookingId
            ? String(item.booking_id) === String(initialBookingId) ||
              item.booking_ids?.some(
                (id) => String(id) === String(initialBookingId),
              )
            : initialName
              ? item.peer_name === initialName
              : true),
      );
      if (match) setSelected(String(match.booking_id));
    }
  }, [activeBookingIds, chats, initialBookingId, initialName, selected]);
  useEffect(() => {
    let live = true,
      timer;
    setMessages([]);
    setDraft("");
    setReading(false);
    if (!selected) return;
    setReading(true);
    async function load() {
      try {
        const rows = await readMessages(selected);
        if (live) setMessages(rows || []);
      } catch (e) {
        if (live) setError(e.message);
      } finally {
        if (live) {
          setReading(false);
          timer = setTimeout(load, 2500);
        }
      }
    }
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [selected, user?.id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, selected]);
  async function submit(e) {
    e.preventDefault();
    if (!canSend || !draft.trim() || !selected || busy.current) return;
    const booking = selected;
    busy.current = true;
    setSending(true);
    setError("");
    try {
      await sendMessage(booking, draft);
      if (active.current === booking) setDraft("");
      const rows = await readMessages(booking);
      if (active.current === booking) setMessages(rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  useEffect(() => {
    let live = true;
    setSession(null);
    let timer;
    async function refreshPeer() {
      if (!selected) return;
      try {
        const d = await chatRequest("chat_booking_details", {
          p_booking_id: selected,
        });
        if (live) setSession(d);
      } catch (e) {
        if (live) setError(e.message);
      } finally {
        if (live) timer = setTimeout(refreshPeer, 30000);
      }
    }
    refreshPeer();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [role, selected]);
  const activeChats =
    activeBookingIds === null
      ? []
      : chats.filter((chat) => activeBookingIds.has(String(chat.booking_id)));
  const filtered = activeChats.filter(
    (c) =>
      (!unreadOnly || Number(c.unread) > 0) &&
      (c.peer_name + " " + c.service_title)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const avatar = (name, details) => (
    <span className="chat-avatar" aria-hidden="true">
      {details?.image && /^https:\/\//i.test(details.image) ? (
        <img
          src={details.image}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : name ? (
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
      ) : (
        <UserRound size={24} />
      )}
    </span>
  );
  return (
    <div
      className={`booking-chat tutor-booking-chat ${role === "learner" ? "learner-booking-chat" : ""}`}
    >
      <h1>Messages</h1>
      <p className="chat-subtitle">
        {role === "tutor"
          ? "Chat with learners about your tutoring services and sessions."
          : "Communicate with your tutors and manage your conversations."}
      </p>
      <div className="chat-columns">
        <aside className="chat-sidebar">
          {role === "tutor" && (
            <h2 className="tutor-conversations-title">Conversations</h2>
          )}
          <div className="chat-search">
            <label>
              <Search size={18} />
              <input
                type="search"
                aria-label="Search conversations"
                placeholder="Search conversations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              title="Show unread conversations"
              aria-label="Show unread conversations"
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly(!unreadOnly)}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>
          <div className="chat-conversations">
            {filtered.map((c) => (
              <button
                key={c.booking_id}
                className={
                  "chat-person " +
                  (selected === String(c.booking_id) ? "selected" : "")
                }
                onClick={() => {
                  pauseSelection.current = false;
                  setSelected(String(c.booking_id));
                  setPanel("");
                }}
              >
                {avatar(c.peer_name)}
                <span className="chat-person-copy">
                  <strong>{c.peer_name}</strong>
                  {c.last_message && <small>{c.last_message}</small>}
                  <small className="chat-muted">{c.service_title}</small>
                </span>
                <span className="chat-person-meta">
                  <small>{c.session_date}</small>
                  {Number(c.unread) > 0 && <b>{c.unread}</b>}
                </span>
              </button>
            ))}
            {!loading && !filtered.length && (
              <p className="chat-empty">
                {activeChats.length
                  ? "No matching conversations."
                  : "Conversations become available after a paid booking is confirmed."}
              </p>
            )}
          </div>
        </aside>
        <section className="chat-main" aria-label="Chat conversation">
          <header className="chat-header">
            {avatar(chat?.peer_name, session)}
            <div className="chat-header-copy">
              <h2>{chat?.peer_name || "Select a conversation"}</h2>
              {chat && (
                <div className="chat-peer-status">
                  <span className={session?.online ? "is-online" : ""}>
                    {session
                      ? session.online
                        ? "Online"
                        : "Offline"
                      : "Checking status..."}
                  </span>
                  {role === "learner" &&
                    ["verified", "approved"].includes(
                      session?.verification?.toLowerCase(),
                    ) && (
                      <b>
                        <ShieldCheck size={12} />
                        Verified Tutor
                      </b>
                    )}
                </div>
              )}
              {role === "learner" ? (
                <p className="chat-peer-program">
                  {session?.program || "Program not provided"}
                </p>
              ) : (
                <p>{chat?.service_title}</p>
              )}
              <small>
                {chat &&
                  (role === "tutor"
                    ? [
                        chat.topic,
                        chat.session_date,
                        session?.start?.slice(0, 5),
                        session?.type,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : chat.topic)}
              </small>
            </div>
            {chat && role === "tutor" && (
              <>
                <a
                  className="chat-outline tutor-meeting-link"
                  href={
                    session?.link && /^https:\/\//i.test(session.link)
                      ? session.link
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!session?.link}
                >
                  <ExternalLink size={16} />
                  {session?.platform || "Meeting"} · External Link
                </a>
                <button
                  aria-label="Session details"
                  onClick={() => setPanel("session")}
                >
                  <Info size={22} />
                </button>
              </>
            )}
            {chat && role !== "tutor" && (
              <>
                <button
                  className="chat-outline"
                  disabled={!session}
                  onClick={() =>
                    onProfile ? onProfile(session) : setPanel("profile")
                  }
                >
                  View Profile
                </button>
                <details className="chat-menu" key={selected}>
                  <summary aria-label="Conversation options">
                    <MoreVertical size={22} />
                  </summary>
                  <div>
                    <button
                      onClick={(e) => {
                        e.currentTarget.closest("details").open = false;
                        setPanel("session");
                      }}
                    >
                      <CalendarDays size={16} />
                      View session details
                    </button>
                    <button
                      onClick={(e) => {
                        e.currentTarget.closest("details").open = false;
                        markUnread();
                      }}
                    >
                      <Mail size={16} />
                      Mark as unread
                    </button>
                    <button
                      className="chat-report-action"
                      onClick={(e) => {
                        e.currentTarget.closest("details").open = false;
                        setPanel("report");
                      }}
                    >
                      <Flag size={16} />
                      Report an issue
                    </button>
                  </div>
                </details>
              </>
            )}
          </header>
          {error && (
            <p role="alert" className="chat-error">
              {error}{" "}
              <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
            </p>
          )}
          {(loading || reading) && (
            <p role="status" className="chat-empty">
              Loading messages...
            </p>
          )}
          <div className="chat-history" role="log" aria-label="Messages">
            {messages.map((m, i) => {
              const mine = m.sender_id === user?.id;
              const day = new Date(m.sent_at).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "long",
              });
              const prev = i
                ? new Date(messages[i - 1].sent_at).toLocaleDateString(
                    "en-PH",
                    { timeZone: "Asia/Manila", dateStyle: "long" },
                  )
                : "";
              return (
                <div key={m.message_id}>
                  {day !== prev && (
                    <div className="chat-day">
                      <span>{day}</span>
                    </div>
                  )}
                  <div className={"chat-message " + (mine ? "mine" : "")}>
                    {!mine && avatar(chat?.peer_name)}
                    <div className="chat-bubble">
                      <p>
                        {m.message_content
                          .split(/(https?:\/\/[^\s]+)/g)
                          .map((part, k) =>
                            /^https?:\/\//.test(part) ? (
                              <a
                                key={k}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {part}
                              </a>
                            ) : (
                              part
                            ),
                          )}
                      </p>
                      <small>
                        {stamp(m.sent_at)}
                        {mine && m.read_at && <CheckCheck size={14} />}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottom} />
          </div>
          {chat && !canSend && (
            <p className="chat-locked-note" role="status">
              Chat closes 24 hours after session completion. Your conversation
              stays here. A new paid booking with this tutor reopens chat for
              any subject or topic.
            </p>
          )}
          <form className="chat-composer" onSubmit={submit}>
            <div className="chat-compose-row">
              <div className="chat-compose-input">
                <input
                  aria-label="Message"
                  placeholder={
                    canSend ? "Type your message..." : "Chat is read-only"
                  }
                  maxLength={3000}
                  disabled={!chat || !canSend || sending}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="button"
                  aria-label="Choose emoji"
                  disabled={!chat || !canSend || sending}
                  onClick={() => setEmojis(!emojis)}
                >
                  <Smile size={19} />
                </button>
                {emojis && (
                  <div className="chat-emojis">
                    {["😀", "👋", "👍", "😊", "🙏", "✅"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setDraft((d) => (d + emoji).slice(0, 3000));
                          setEmojis(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="chat-send"
                type="submit"
                disabled={!chat || !canSend || !draft.trim() || sending}
              >
                <Send size={16} />
                <span>{sending ? "Sending" : "Send"}</span>
              </button>
            </div>
            {role === "tutor" ? (
              <p className="tutor-chat-note">Internal text messaging only</p>
            ) : (
              <p className="chat-safety">
                <Info size={25} />
                <span>
                  Keep your communication within Kasangga for your safety.
                  <br />
                  Do not share personal contact information.
                </span>
              </p>
            )}
          </form>
        </section>
      </div>
      {panel && chat && (
        <ChatDetails
          key={selected + panel}
          role={role}
          chat={chat}
          mode={panel}
          close={() => setPanel("")}
        />
      )}
    </div>
  );
}
