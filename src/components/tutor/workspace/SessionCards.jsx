import "../../learner/sessions/sessions.css";
import {
  ExternalLink,
  MapPin,
  Video,
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  MessageCircle,
  Flag,
  XCircle,
  View,
  CheckCircle,
} from "lucide-react";
import { hour, time } from "./data.js";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import "./sessions.css";
export function MeetingBrand({ provider, compact = false }) {
  return (
    <span
      className={`meeting-brand ${provider === "Zoom" ? "zoom-brand" : ""}`}
      aria-label={provider}
    >
      {provider === "Zoom" ? (
        <span className="zoom-symbol">
          <Video size={13} fill="white" />
        </span>
      ) : (
        <svg width="23" height="20" viewBox="0 0 24 20" aria-hidden="true">
          <path fill="#00832d" d="m16 6 7-4v16l-7-4z" />
          <path fill="#00ac47" d="M6 5h11v11H6z" />
          <path fill="#4285f4" d="M1 5h5v11H1z" />
          <path fill="#ea4335" d="M1 5 6 0v5z" />
          <path fill="#fbbc04" d="M6 0h8l3 5H6z" />
          <path fill="#188038" d="M6 16h11v4H6z" />
          <path fill="#1967d2" d="M1 16h5v4z" />
        </svg>
      )}
      {!compact && (provider === "Zoom" ? "zoom" : "Google Meet")}
    </span>
  );
}
export default function SessionCards({
  rows,
  onDetails,
  onMessage,
  onMeeting,
  onAction,
}) {
  const cash = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  });
  return (
    <div className="space-y-3 tutor-session-cards">
      {rows.map((s) => {
        const date = new Date(s.date + "T12:00:00");
        const active =
          s.status === "Confirmed" &&
          ["Paid", "Partially Refunded"].includes(s.payment);
        const ended =
          new Date(
            s.endAt || s.date + "T" + String(s.end).slice(0, 8) + "+08:00",
          ) <= new Date();
        const messageClosed =
          s.status === "Completed" &&
          (!s.completedAt ||
            Date.now() >= new Date(s.completedAt).getTime() + 86400000);
        return (
          <article className="learner-session-card" key={s.id}>
            <div className="text-center font-bold text-[#087542]">
              <p>{date.toLocaleDateString("en-US", { month: "short" })}</p>
              <p className="text-2xl text-[#101828]">{date.getDate()}</p>
              <p className="whitespace-nowrap">
                {date.toLocaleDateString("en-US", { weekday: "long" })}
              </p>
              <p className="mt-1 text-[#637191]">{date.getFullYear()}</p>
            </div>
            <div className="flex items-center gap-2">
              <PortalAvatar
                name={s.learner}
                userId={s.learnerUserId || s.learnerId}
                className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 font-bold text-[#405276]"
              />
              <div>
                <h3 className="font-bold">{s.learner}</h3>
                <p className="mt-1 text-blue-600">{s.service}</p>
              </div>
            </div>
            <div className="space-y-1 text-[#405276]">
              <p className="font-bold text-[#101828]">
                <GraduationCap className="mr-1 inline h-3.5 w-3.5" />
                {s.service}
              </p>
              <p>
                <View className="mr-1 inline h-3.5 w-3.5" />
                Topic: {s.topic || "Not provided"}
              </p>
              <p>
                <FileText className="mr-1 inline h-3.5 w-3.5" />
                {(hour(s.end) - hour(s.start)).toLocaleString()} hours
              </p>
            </div>
            <div className="space-y-1 text-[#405276]">
              <p>
                <CalendarDays className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                <br />
                <span className="ml-5">
                  {date.toLocaleDateString("en-US", { weekday: "long" })}
                </span>
              </p>
              <p>
                <Clock3 className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                {time(hour(s.start))} - {time(hour(s.end))}
              </p>
            </div>
            <div className="space-y-1 text-[#405276]">
              <p>
                <Video className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                {s.type}
              </p>
              <p>
                <MapPin className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                {s.provider}
              </p>
              <p className="text-[10px]">{s.lifecycle || s.status}</p>
            </div>
            <div className="text-center">
              <p className="whitespace-nowrap text-base font-bold">
                {cash.format(s.amount)}
              </p>
              <span className="mt-1 inline-block rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
                {s.payment}
              </span>
            </div>
            <div className="learner-session-actions">
              <div className="grid grid-cols-2 gap-2">
                {s.type === "Online" && active && (
                  <button
                    className="tutor-session-meeting col-span-2"
                    onClick={() => onMeeting(s)}
                  >
                    <ExternalLink size={15} />
                    Open External Meeting
                  </button>
                )}
                {(active || s.status === "Completed") && (
                  <button
                    className="col-span-2"
                    disabled={messageClosed}
                    onClick={() => onMessage(s)}
                  >
                    <MessageCircle size={15} />
                    Message Learner
                  </button>
                )}
                {s.lifecycle === "Upcoming" && active && (
                  <button
                    className="tutor-session-cancel"
                    onClick={() => onAction(s, "cancel")}
                  >
                    <XCircle size={15} />
                    Cancel Session
                  </button>
                )}
                {!["Cancelled", "Canceled"].includes(s.status) && (
                  <button
                    className="report-issue-button"
                    onClick={() => onAction(s, "incident")}
                  >
                    <Flag size={15} />
                    Report an Issue
                  </button>
                )}
                {active &&
                  s.payment === "Paid" &&
                  s.lifecycle !== "Upcoming" && (
                    <button
                      className="col-span-2"
                      disabled={!ended}
                      onClick={() => onAction(s, "complete")}
                    >
                      <CheckCircle size={15} />
                      Done Session
                    </button>
                  )}
                <button className="col-span-2" onClick={() => onDetails(s)}>
                  <View size={15} />
                  View Session
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
