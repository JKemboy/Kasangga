import { useState } from "react";
import { Bell } from "lucide-react";
import { button } from "../tutor/workspace/ui.jsx";

export default function AdminNotifications({ rows, error, onRead, go }) {
  const [filter, setFilter] = useState("All Notifications");
  const [busy, setBusy] = useState(false);
  const unread = rows.filter((row) => !row.read);
  const visible = filter === "Unread" ? unread : rows;
  async function read(ids) {
    setBusy(true);
    try {
      return await onRead(ids);
    } finally {
      setBusy(false);
    }
  }
  function destination(row) {
    return {
      tutor_applications: "Tutor Verification",
      payments: "Payments & Transactions",
      refunds: "Payments & Transactions",
      bookings: "Bookings Monitoring",
      services: "Service Management",
      incident_reports: "Incident Reports",
      support_conversations: "Messages",
    }[row.entityType];
  }
  return (
    <section className="ad-page">
      <div className="osas-heading">
        <div>
          <h1>Notifications</h1>
          <p>
            Stay updated with applications, payments, reports and system
            activity.
          </p>
        </div>
        <button
          type="button"
          className={button}
          disabled={!unread.length || busy}
          onClick={() => read(unread.map((row) => row.id))}
        >
          Mark all as read
        </button>
      </div>
      <div className="au-tabs">
        {["All Notifications", "Unread"].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value} ({value === "Unread" ? unread.length : rows.length})
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!visible.length && (
        <p className="ad-panel" role="status">
          No notifications to display.
        </p>
      )}
      {visible.map((row) => (
        <article
          key={row.id}
          className={
            "ad-panel " + (!row.read ? "border-l-4 border-l-green-700" : "")
          }
        >
          <h2>
            <Bell size={18} />
            {row.title}{" "}
            {!row.read && (
              <span className="text-xs text-green-800">Unread</span>
            )}
          </h2>
          <p className="my-2 whitespace-pre-wrap text-sm">{row.text}</p>
          <p className="ad-help">
            {new Date(row.time).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
            })}
          </p>
          <div className="mt-3 flex gap-2">
            {!row.read && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => read([row.id])}
              >
                Mark as read
              </button>
            )}
            {destination(row) && (
              <button
                type="button"
                className={button}
                onClick={async () => {
                  if ((await read([row.id])) !== false) go(destination(row));
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
