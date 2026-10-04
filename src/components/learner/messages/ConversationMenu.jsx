import { useEffect, useRef, useState } from "react";
import { MoreVertical, CalendarDays, Mail, Flag } from "lucide-react";
import { button } from "../../tutor/workspace/ui.jsx";
import { sessionRecords } from "../sessions/sessionRecords.js";
import { sessionInfo } from "../workspace/SessionDialog.jsx";
export function relatedSessions(data, name) {
  const records = [
    ...sessionRecords.map((s) => ({
      ...s,
      ...data.sessions.find((x) => x.id === s.id),
    })),
    ...data.sessions.filter((s) => !sessionRecords.some((x) => x.id === s.id)),
  ];
  return records.map(sessionInfo).filter((s) => s.name === name);
}
export default function ConversationMenu({ work, thread }) {
  const [opened, setOpened] = useState(false);
  const ref = useRef(null),
    trigger = useRef(null);
  const sessions = relatedSessions(work.data, thread.name);
  const upcoming = sessions
    .filter((s) => s.lifecycle === "Upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  useEffect(() => {
    if (!opened) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpened(false);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        setOpened(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    ref.current?.querySelector("[role=menuitem]:not(:disabled)")?.focus();
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [opened]);
  const act = (fn) => {
    setOpened(false);
    fn();
  };
  return (
    <div className="ml-auto flex items-center gap-3">
      <button
        className={button}
        disabled={thread.name === "CampusTutor Support"}
        onClick={() =>
          work.open(
            "profile",
            work.data.saved.find((t) => t.name === thread.name) || {
              name: thread.name,
            },
          )
        }
      >
        View Profile
      </button>
      <div className="relative" ref={ref}>
        <button
          ref={trigger}
          aria-label="Conversation options"
          aria-haspopup="menu"
          aria-expanded={opened}
          onClick={() => setOpened(!opened)}
          className="rounded p-2 hover:bg-slate-100"
        >
          <MoreVertical size={20} />
        </button>
        {opened && (
          <div
            role="menu"
            aria-label="Conversation options"
            className="absolute right-0 top-full z-30 w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-xl"
            onKeyDown={(e) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const items = [
                ...e.currentTarget.querySelectorAll(
                  "[role=menuitem]:not(:disabled)",
                ),
              ];
              let i = items.indexOf(document.activeElement);
              i =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? items.length - 1
                    : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                      items.length;
              items[i]?.focus();
            }}
          >
            <button
              role="menuitem"
              disabled={!upcoming}
              title={
                !upcoming ? "No upcoming session with this tutor" : undefined
              }
              className="flex w-full items-center gap-3 rounded p-3 text-left hover:bg-slate-50 disabled:text-slate-400"
              onClick={() => act(() => work.open("details", upcoming))}
            >
              <CalendarDays size={16} />
              View upcoming session
            </button>
            <button
              role="menuitem"
              className="flex w-full items-center gap-3 rounded p-3 text-left hover:bg-slate-50"
              onClick={() =>
                act(() =>
                  work.commit((d) => ({
                    ...d,
                    threads: d.threads.map((t) =>
                      t.name === thread.name
                        ? { ...t, unread: Math.max(1, t.unread || 0) }
                        : t,
                    ),
                  })),
                )
              }
            >
              <Mail size={16} />
              Mark as unread
            </button>
            <button
              role="menuitem"
              className="flex w-full items-center gap-3 border-t border-slate-100 p-3 text-left text-red-600 hover:bg-red-50"
              onClick={() =>
                act(() =>
                  work.open("report", {
                    name: thread.name,
                    bookings: sessions,
                  }),
                )
              }
            >
              <Flag size={16} />
              Report an issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
