// Shared inbox UI: renders role-provided notifications and conversations; parent handlers own database reads/writes.
import { useEffect, useRef, useState } from "react";
import FollowUpEvidence from "./FollowUpEvidence.jsx";
import {
  Bell,
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  BriefcaseBusiness,
  Monitor,
} from "lucide-react";
import { Modal, primary, Avatar } from "../tutor/workspace/ui.jsx";
import "./header-inbox.css";
const icons = {
  session: CalendarDays,
  message: MessageCircle,
  application: ShieldCheck,
  incident: AlertTriangle,
  payment: CreditCard,
  service: BriefcaseBusiness,
  system: Monitor,
};
export default function HeaderInbox({
  role,
  notifications = [],
  threads = [],
  showMessages = true,
  onRead,
  onNotification,
  onThread,
  onNavigate,
  inboxError = "",
}) {
  const [panel, setPanel] = useState(null),
    [detail, setDetail] = useState(null);
  const [read, setRead] = useState(() => {
    return [];
  });
  const root = useRef(null),
    bell = useRef(null),
    messages = useRef(null);
  useEffect(() => {
    if (!panel) return;
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setPanel(null);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setPanel(null);
        (panel === "notifications" ? bell : messages).current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [panel]);
  const isRead = (n) => n.read || read.includes(n.id);
  function mark(items) {
    if (onRead) {
      onRead(items.map((n) => n.id));
      return;
    }
    setRead((current) => [...new Set([...current, ...items.map((n) => n.id)])]);
  }
  const unread = notifications.filter((n) => !isRead(n)).length;
  const unreadMessages = threads.reduce(
    (count, thread) => count + Number(thread.unread || 0),
    0,
  );
  return (
    <div className="header-inbox" ref={root}>
      <button
        ref={bell}
        className="hi-trigger"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={panel === "notifications"}
        onClick={() =>
          setPanel(panel === "notifications" ? null : "notifications")
        }
      >
        <Bell size={22} />
        {unread > 0 && <span className="hi-count">{unread}</span>}
      </button>
      {showMessages && (
        <button
          ref={messages}
          className="hi-trigger"
          aria-label="Messages"
          aria-expanded={panel === "messages"}
          onClick={() => setPanel(panel === "messages" ? null : "messages")}
        >
          <MessageCircle size={22} />
          {unreadMessages > 0 && (
            <span className="hi-count">{unreadMessages}</span>
          )}
        </button>
      )}
      {panel && (
        <section
          className="hi-panel"
          aria-label={panel === "notifications" ? "Notifications" : "Messages"}
        >
          <header>
            <strong>
              {panel === "notifications"
                ? "Notifications"
                : role === "admin"
                  ? "Support messages"
                  : "Messages"}
            </strong>
            {panel === "notifications" ? (
              <button disabled={!unread} onClick={() => mark(notifications)}>
                Mark all as read
              </button>
            ) : (
              <span>From users</span>
            )}
          </header>
          {inboxError && <p role="alert">{inboxError}</p>}
          <div className="hi-list">
            {panel === "notifications"
              ? notifications.map((n) => {
                  const Icon = icons[n.kind] || Bell;
                  return (
                    <button
                      className={`hi-item ${isRead(n) ? "" : "hi-unread"}`}
                      key={n.id}
                      onClick={() => {
                        mark([n]);
                        setPanel(null);
                        if (onNotification) onNotification(n);
                        else setDetail({ notification: n });
                      }}
                    >
                      <span className={`hi-icon hi-${n.kind || "system"}`}>
                        <Icon size={20} />
                      </span>
                      <span>
                        <strong>{n.title}</strong>
                        <span>{n.text || n.detail}</span>
                        <small>{n.time || n.at}</small>
                      </span>
                      {!isRead(n) && <i className="hi-dot" />}
                    </button>
                  );
                })
              : threads.map((t) => (
                  <button
                    className="hi-item"
                    key={t.id || t.name}
                    onClick={() => {
                      setPanel(null);
                      if (onThread) onThread(t);
                      else setDetail({ thread: t });
                    }}
                  >
                    <Avatar name={t.name} />
                    <span>
                      <strong>{t.name}</strong>
                      <span>
                        {t.last_message ||
                          t.messages?.at(-1)?.text ||
                          "Open conversation"}
                      </span>
                      <small>
                        {t.last_message_at ||
                          t.messages?.at(-1)?.time ||
                          t.session_date}
                      </small>
                    </span>
                  </button>
                ))}
            {(panel === "notifications" ? notifications : threads).length ===
              0 && (
              <p className="hi-empty">
                {panel === "notifications"
                  ? "You’re all caught up. No notifications yet."
                  : "No conversations yet."}
              </p>
            )}
          </div>
        </section>
      )}
      {detail && (
        <Modal
          title={detail.thread?.name || detail.notification.title}
          subtitle={
            detail.thread?.demo
              ? "Demo support conversation"
              : detail.notification?.demo
                ? "Demo notification"
                : undefined
          }
          onClose={() => setDetail(null)}
        >
          <div className="hi-conversation">
            {detail.thread ? (
              detail.thread.messages.map((m, i) => (
                <article key={i}>
                  <p>{m.text}</p>
                  <small>{m.time}</small>
                </article>
              ))
            ) : (
              <div>
                <p>{detail.notification.text}</p>
                {detail.notification.notificationType ===
                  "case_evidence_requested" && (
                  <FollowUpEvidence
                    key={detail.notification.id}
                    caseId={detail.notification.entityId}
                  />
                )}
              </div>
            )}
            <>
              {detail.notification?.view && onNavigate && (
                <button
                  className={primary}
                  onClick={() => {
                    onNavigate(detail.notification.view);
                    setDetail(null);
                  }}
                >
                  Open {detail.notification.view}
                </button>
              )}{" "}
              <button className={primary} onClick={() => setDetail(null)}>
                Close
              </button>
            </>
          </div>
        </Modal>
      )}
    </div>
  );
}
