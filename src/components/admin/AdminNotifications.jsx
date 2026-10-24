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
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!row.read && (await read([row.id])) === false) return;
            if (destination(row)) go(destination(row));
          }}
          key={row.id}
          className={
            "ad-panel block w-full text-left " +
            (!row.read ? "border-l-4 border-l-green-700" : "")
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
          {destination(row) && (
            <span className={button + " mt-3 inline-block"}>View Details</span>
          )}
        </button>
      ))}
    </section>
  );
}
