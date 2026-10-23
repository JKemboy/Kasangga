import { useState } from "react";
import { Bell } from "lucide-react";
import { button, primary, input } from "../tutor/workspace/ui.jsx";

export default function OsasNotifications({
  rows = [],
  loading,
  error,
  onRead,
  onOpen,
}) {
  const [filter, setFilter] = useState("All Notifications");
  const [pending, setPending] = useState(false);
  const unread = rows.filter((row) => !row.read);
  const visible = [...(filter === "Unread" ? unread : rows)].sort((a, b) =>
    String(b.time).localeCompare(String(a.time)),
  );
  async function read(ids) {
    setPending(true);
    try {
      return await onRead(ids);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-4">
      <div className="osas-heading">
        <div>
          <h1>
            Notifications <Bell size={23} />
          </h1>
          <p>View referral, case, evidence, clearance and policy updates.</p>
        </div>
        <button
          type="button"
          className={button}
          disabled={pending || loading || !unread.length}
          onClick={() => read(unread.map((row) => row.id))}
        >
          Mark all as read
        </button>
      </div>
      <label className="block max-w-xs text-xs font-semibold">
        Show notifications
        <select
          aria-label="Notification filter"
          className={input + " mt-1"}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option>All Notifications</option>
          <option>Unread</option>
        </select>
      </label>
      <p className="text-xs text-slate-500">
        {unread.length} unread · {rows.length} total
      </p>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading notifications...</p>
      ) : (
        !visible.length && (
          <p
            role="status"
            className="rounded-lg border bg-white p-5 text-sm text-slate-500"
          >
            {filter === "Unread"
              ? "You're all caught up. No unread notifications."
              : "No notifications yet."}
          </p>
        )
      )}
      {visible.map((row) => (
        <article
          key={row.id}
          className={
            "rounded-lg border bg-white p-4 " +
            (!row.read ? "border-l-4 border-l-green-700" : "")
          }
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bell size={16} className="text-green-800" />
            {row.title}
            {!row.read && (
              <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-800">
                Unread
              </span>
            )}
          </h2>
          <p className="my-2 whitespace-pre-wrap text-sm">{row.text}</p>
          <time className="text-xs text-slate-500" dateTime={row.time}>
            {new Date(row.time).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
            })}
          </time>
          <div className="mt-3 flex flex-wrap gap-2">
            {!row.read && (
              <button
                type="button"
                className={button}
                disabled={pending}
                onClick={() => read([row.id])}
              >
                Mark as read
              </button>
            )}
            {row.entityType && row.entityId && (
              <button
                type="button"
                className={primary}
                disabled={pending}
                onClick={async () => {
                  if (!row.read && (await read([row.id])) === false) return;
                  onOpen(row);
                }}
              >
                View Details
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
