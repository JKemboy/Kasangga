import { ExternalLink } from "lucide-react";
import { meetingUrl } from "../../services/sessionMeeting.js";
import { button, primary } from "../tutor/workspace/ui.jsx";
export default function ExternalMeeting({
  service,
  person,
  date,
  time,
  platform,
  link,
  active = true,
  onClose,
}) {
  const url = active ? meetingUrl(link) : null;
  const provider = platform || "the meeting platform";
  return (
    <div className="space-y-4 p-1 text-sm">
      <div className="session-meeting">
        <ExternalLink />
        <div>
          <strong>{[service, person].filter(Boolean).join(" - ")}</strong>
          <p>
            {date} - {time}
          </p>
        </div>
      </div>
      <p>
        This session runs on {provider}, outside Kasangga. Kasangga has no
        built-in video or voice calls.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          <a
            className={primary}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open {provider}
          </a>
        ) : (
          <p role="status">
            {active
              ? "No meeting link has been provided."
              : "This meeting is no longer active."}
          </p>
        )}
        <button type="button" className={button} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
