import { useAuth } from "../../../auth/AuthProvider.jsx";
import { workspaceProfile } from "../../../services/authAccount.js";
import AccountAction from "./AccountAction.jsx";
import ReviewDialog from "./ReviewDialog.jsx";
import LearnerReport from "./LearnerReport.jsx";
import SessionDialog from "./SessionDialog.jsx";
import TutorProfile from "./TutorProfile.jsx";
import BookingFlow from "./BookingFlow.jsx";
import { createContext, useContext, useEffect, useState } from "react";
import {
  Modal,
  Field,
  button,
  primary,
  input,
} from "../../tutor/workspace/ui.jsx";
import { useInteractions } from "../../shared/InteractionProvider.jsx";
import { meetingUrl } from "../../tutor/workspace/sessionActions.js";

const Context = createContext(null);
export const useLearnerWorkspace = () => useContext(Context);
const key = "campustutor:learner-workspace:v1";
const empty = {
  saved: [],
  sessions: [],
  reviews: [],
  threads: [],
  notifications: [],
  requests: [],
  settings: {},
  profile: {},
  application: null,
};
function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return { ...empty, ...value };
  } catch {
    return empty;
  }
}
export default function LearnerWorkspace({ children, go }) {
  const auth = useAuth();
  const storageKey = `${key}:${auth?.user?.id || "signed-out"}`;
  const [data, setData] = useState(() => ({ ...load(storageKey), profile: { ...load(storageKey).profile, ...workspaceProfile(auth?.profile, auth?.user) } })),
    [dialog, setDialog] = useState(null),
    [error, setError] = useState("");
  const { toast, confirm } = useInteractions();
  useEffect(() => {
    if (!auth?.profile) return;
    setData(previous => ({ ...previous, profile: { ...previous.profile, ...workspaceProfile(auth.profile, auth.user) } }));
  }, [auth?.profile, auth?.user]);
  function commit(change) {
    try {
      const next = change(data);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setData(next);
      return true;
    } catch {
      setError("Could not save. Browser storage is unavailable or full.");
      return false;
    }
  }
  function open(kind, record = {}) {
    setError("");
    if (kind === "application") {
      setDialog(null);
      go("application");
      return;
    }
    setDialog({ kind, record, step: 0 });
  }
  function toggleSave(tutor) {
    const exists = data.saved.some((t) => t.name === tutor.name);
    if (
      commit((d) => ({
        ...d,
        saved: exists
          ? d.saved.filter((t) => t.name !== tutor.name)
          : [tutor, ...d.saved],
      }))
    )
      toast(exists ? "Tutor removed from Saved Tutors." : "Tutor saved.");
  }
  function message(tutor) {
    if (
      !commit((d) => ({
        ...d,
        activeThread: tutor.name,
        threads: d.threads.some((t) => t.name === tutor.name)
          ? d.threads
          : [...d.threads, { name: tutor.name, messages: [], unread: 0 }],
      }))
    )
      return;
    go("messages");
    setDialog(null);
  }
  function request(type, values) {
    const record = {
      id: crypto.randomUUID(),
      type,
      ...values,
      status: "Pending",
      created: new Date().toISOString(),
    };
    if (!commit((d) => ({ ...d, requests: [...d.requests, record] }))) return;
    setDialog(null);
    toast("Request saved locally. Server delivery is not connected.");
  }
  const api = { data, commit, open, toggleSave, message, go, request };
  const r = dialog?.record;
  return (
    <Context.Provider value={api}>
      {children}
      {dialog && dialog.kind !== "application" && (
        <Modal
          size={
            dialog.kind === "profile"
              ? "profile"
              : dialog.kind === "book"
                ? "booking"
                : dialog.kind === "details"
                  ? "session-drawer"
                  : ["cancel", "reschedule", "report", "review"].includes(
                        dialog.kind,
                      )
                    ? "session-modal"
                    : ["data", "delete"].includes(dialog.kind)
                      ? "account"
                      : "default"
          }
          title={
            {
              profile: "Tutor Profile",
              book: "Book a Session",
              details: "Session Details",
              meeting: "Open External Meeting",
              reschedule: "Request Reschedule",
              cancel: "Cancel Session",
              report: "Report an Issue",
              review:
                data.reviews.find((x) => x.sessionId === r.id) || r.review
                  ? "Edit Review"
                  : "Rate & Review Tutor",
              editProfile: "Edit Profile",
              application: "Apply as Tutor",
              data: "Request My Data",
              delete: "Delete Account",
              article: r?.title,
            }[dialog.kind] || dialog.kind
          }
          onClose={() => setDialog(null)}
        >
          {dialog.kind === "profile" && (
            <TutorProfile
              record={r}
              saved={data.saved.some((t) => t.name === r.name)}
              onSave={toggleSave}
              onMessage={message}
              onBook={(t) => open("book", t)}
            />
          )}
          {dialog.kind === "book" && (
            <BookingFlow
              tutor={r}
              onClose={() => setDialog(null)}
              onComplete={(booking) =>
                commit((d) => ({
                  ...d,
                  sessions: [
                    ...d.sessions.filter((s) => s.id !== booking.bookingId),
                    { ...booking, id: booking.bookingId },
                  ],
                }))
              }
            />
          )}
          {["details", "cancel", "reschedule"].includes(dialog.kind) && (
            <SessionDialog
              key={dialog.kind}
              kind={dialog.kind}
              record={{
                ...r,
                review:
                  data.reviews.find((x) => x.sessionId === r.id) || r.review,
              }}
              onClose={() => setDialog(null)}
              onOpen={open}
              onMessage={message}
              onRequest={(values) =>
                request("reschedule", { sessionId: r.id, ...values })
              }
              onCancel={(values) => {
                if (
                  commit((d) => ({
                    ...d,
                    sessions: [
                      ...d.sessions.filter((s) => s.id !== r.id),
                      {
                        ...r,
                        ...values,
                        lifecycle: "Cancelled",
                        refundStatus:
                          r.paymentStatus === "Paid"
                            ? "Under Review"
                            : undefined,
                      },
                    ],
                  }))
                ) {
                  setDialog(null);
                  toast(
                    "Session cancelled locally. Server cancellation and refund processing are not connected.",
                  );
                }
              }}
            />
          )}
          {dialog.kind === "meeting" && (
            <div className="space-y-3 text-sm">
              <p>This session runs outside CampusTutor.</p>
              {meetingUrl(r.link) ? (
                <a
                  className={primary}
                  href={meetingUrl(r.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Meeting
                </a>
              ) : (
                <p>No meeting link is available. Contact your tutor.</p>
              )}
              <button className={button} onClick={() => setDialog(null)}>
                Close
              </button>
            </div>
          )}
          {dialog.kind === "report" && (
            <LearnerReport
              record={r}
              onClose={() => setDialog(null)}
              onSubmit={(values) => request("report", values)}
            />
          )}
          {dialog.kind === "review" && (
            <ReviewDialog
              record={r}
              review={
                data.reviews.find((x) => x.sessionId === r.id) || r.review
              }
              onClose={() => setDialog(null)}
              onSave={(values) => {
                if (r.lifecycle !== "Completed") return;
                if (
                  commit((d) => ({
                    ...d,
                    reviews: [
                      ...d.reviews.filter((x) => x.sessionId !== r.id),
                      {
                        sessionId: r.id,
                        name: r.name,
                        ...values,
                        date: new Date().toISOString(),
                        session: r,
                      },
                    ],
                  }))
                ) {
                  setDialog(null);
                  toast("Review saved locally.");
                }
              }}
            />
          )}
          {dialog.kind === "editProfile" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                if (
                  commit((d) => ({
                    ...d,
                    profile: { ...d.profile, ...values },
                  }))
                ) {
                  setDialog(null);
                  toast("Profile updated.");
                }
              }}
            >
              <Field
                label="Contact Number"
                name="phone"
                defaultValue={data.profile.phone || ""}
                pattern="09[0-9]{9}"
                placeholder="09XXXXXXXXX"
              />
              <Field label="About Me">
                <textarea
                  name="bio"
                  className={input}
                  defaultValue={data.profile.bio || ""}
                  maxLength={1000}
                />
              </Field>
              <Field label="Year Level">
                <select
                  name="year"
                  className={input}
                  defaultValue={data.profile.year || "1st Year"}
                >
                  {[
                    "1st Year",
                    "2nd Year",
                    "3rd Year",
                    "4th Year",
                    "5th Year",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <button className={primary}>Save Changes</button>
            </form>
          )}
          {["data", "delete"].includes(dialog.kind) && (
            <AccountAction
              key={dialog.kind}
              kind={dialog.kind}
              email={data.profile.email || "juan.delacruz@carsu.edu.ph"}
              onClose={() => setDialog(null)}
              onRequest={request}
            />
          )}
          {dialog.kind === "article" && (
            <div className="space-y-3 text-sm">
              <p>{r.body}</p>
              <button
                className={button}
                onClick={() => message({ name: "CampusTutor Support" })}
              >
                Contact Support
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </Modal>
      )}
    </Context.Provider>
  );
}
