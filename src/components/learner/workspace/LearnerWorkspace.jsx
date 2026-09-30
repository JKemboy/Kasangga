import TutorProfile from "./TutorProfile.jsx";
import BookingFlow from "./BookingFlow.jsx";
import { createContext, useContext, useState } from "react";
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
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return { ...empty, ...value };
  } catch {
    return empty;
  }
}
export default function LearnerWorkspace({ children, go }) {
  const [data, setData] = useState(load),
    [dialog, setDialog] = useState(null),
    [error, setError] = useState("");
  const { toast, confirm } = useInteractions();
  function commit(change) {
    try {
      const next = change(data);
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      return true;
    } catch {
      setError("Could not save. Browser storage is unavailable or full.");
      return false;
    }
  }
  function open(kind, record = {}) {
    setError("");
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
      !data.threads.some((t) => t.name === tutor.name) &&
      !commit((d) => ({
        ...d,
        threads: [...d.threads, { name: tutor.name, messages: [], unread: 0 }],
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
      {dialog && (
        <Modal
          size={dialog.kind === "profile" ? "profile" : "default"}
          title={
            {
              profile: "Tutor Profile",
              book: "Book a Session",
              details: "Session Details",
              meeting: "Open External Meeting",
              reschedule: "Request Reschedule",
              cancel: "Cancel Session",
              report: "Report an Issue",
              review: "Rate & Review",
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
                    ...d.sessions,
                    { ...booking, id: booking.bookingId },
                  ],
                }))
              }
            />
          )}
          {dialog.kind === "details" && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                {Object.entries(r)
                  .filter(
                    ([k, v]) =>
                      !["details", "initials"].includes(k) &&
                      typeof v !== "object",
                  )
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-semibold capitalize">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  onClick={() => message({ name: r.name })}
                >
                  Message Tutor
                </button>
                {!["Completed", "Cancelled"].includes(r.lifecycle) && (
                  <>
                    <button
                      className={button}
                      onClick={() => open("reschedule", r)}
                    >
                      Reschedule
                    </button>
                    <button
                      className={button}
                      onClick={() => open("cancel", r)}
                    >
                      Cancel Session
                    </button>
                  </>
                )}
                <button className={button} onClick={() => open("report", r)}>
                  Report an Issue
                </button>
                {r.lifecycle === "Completed" && (
                  <button className={button} onClick={() => open("review", r)}>
                    Rate & Review
                  </button>
                )}
              </div>
            </div>
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
          {["reschedule", "cancel", "report", "review"].includes(
            dialog.kind,
          ) && (
            <form
              className="space-y-3 text-sm"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                if (dialog.kind === "cancel") {
                  if (
                    !(await confirm({
                      title: "Cancel this session?",
                      message:
                        "Refund eligibility is reviewed separately. Your original session cannot be restored by closing this dialog.",
                      accept: "Confirm Cancellation",
                      danger: true,
                    }))
                  )
                    return;
                  const record = {
                    ...r,
                    lifecycle: "Cancelled",
                    paymentStatus:
                      r.paymentStatus === "Paid"
                        ? "Refund Under Review"
                        : "Payment Voided",
                    reason: f.reason,
                  };
                  if (
                    commit((d) => ({
                      ...d,
                      sessions: [
                        ...d.sessions.filter((s) => s.id !== r.id),
                        record,
                      ],
                    }))
                  ) {
                    setDialog(null);
                    toast("Session cancelled locally.");
                  }
                  return;
                }
                if (dialog.kind === "review") {
                  if (
                    commit((d) => ({
                      ...d,
                      reviews: [
                        ...d.reviews.filter((x) => x.sessionId !== r.id),
                        {
                          sessionId: r.id,
                          name: r.name,
                          rating: Number(f.rating),
                          text: f.reason,
                          date: new Date().toISOString(),
                        },
                      ],
                    }))
                  ) {
                    setDialog(null);
                    toast("Review saved.");
                  }
                  return;
                }
                request(dialog.kind, { sessionId: r.id, ...f });
              }}
            >
              <p>
                {r.name} · {r.subject || r.service} · {r.date}
              </p>
              {dialog.kind === "reschedule" && (
                <>
                  <Field
                    label="New Date"
                    type="date"
                    name="date"
                    required
                    min={new Date().toLocaleDateString("en-CA", {
                      timeZone: "Asia/Manila",
                    })}
                  />
                  <Field label="New Time" type="time" name="time" required />
                  <p className="text-xs">
                    The original session stays scheduled until your tutor
                    accepts.
                  </p>
                </>
              )}
              {dialog.kind === "report" && (
                <Field label="Incident Type">
                  <select name="type" className={input} required>
                    <option value="">Select a type</option>
                    {[
                      "No-show",
                      "Inappropriate behavior or harassment",
                      "Payment concern",
                      "Technical issue",
                      "Other",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
              )}
              {dialog.kind === "review" && (
                <Field label="Rating">
                  <select
                    name="rating"
                    className={input}
                    defaultValue={
                      data.reviews.find((x) => x.sessionId === r.id)?.rating ||
                      ""
                    }
                    required
                  >
                    <option value="">Choose a rating</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field
                label={
                  dialog.kind === "review" ? "Your Review" : "Reason / Details"
                }
              >
                <textarea
                  name="reason"
                  className={input}
                  required
                  minLength={dialog.kind === "report" ? 20 : 3}
                  maxLength={2000}
                  defaultValue={
                    dialog.kind === "review"
                      ? data.reviews.find((x) => x.sessionId === r.id)?.text
                      : ""
                  }
                />
              </Field>
              {dialog.kind === "cancel" && (
                <label className="flex gap-2 text-xs">
                  <input type="checkbox" required />I understand that a refund
                  is not automatically guaranteed.
                </label>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={button}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button className={primary}>
                  {dialog.kind === "cancel" ? "Confirm Cancellation" : "Submit"}
                </button>
              </div>
            </form>
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
          {dialog.kind === "application" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = Object.fromEntries(new FormData(e.currentTarget));
                if (
                  commit((d) => ({
                    ...d,
                    application: {
                      ...form,
                      status: "Under Review",
                      created: new Date().toISOString(),
                    },
                  }))
                ) {
                  setDialog(null);
                  toast("Application saved locally for review.");
                }
              }}
            >
              {data.application && (
                <p className="text-sm">
                  Current status: {data.application.status}
                </p>
              )}
              <Field label="Subjects" name="subjects" required />
              <Field label="Tutoring Bio">
                <textarea
                  className={input}
                  name="bio"
                  minLength={30}
                  required
                />
              </Field>
              <Field label="Session Type">
                <select className={input} name="type">
                  <option>Online</option>
                  <option>In-person</option>
                  <option>Both</option>
                </select>
              </Field>
              <p className="text-xs">
                Required documents must be uploaded through the document service
                before institutional review.
              </p>
              <label className="flex gap-2 text-xs">
                <input type="checkbox" required />I confirm my application
                information is accurate.
              </label>
              <button className={primary}>Save Application</button>
            </form>
          )}
          {dialog.kind === "data" && (
            <div className="space-y-3 text-sm">
              <p>
                Request a copy of your profile, sessions, messages and payment
                history.
              </p>
              <button
                className={primary}
                onClick={() => request("data-export", {})}
              >
                Request My Data
              </button>
            </div>
          )}
          {dialog.kind === "delete" && (
            <form
              className="space-y-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                request("account-deletion", {});
              }}
            >
              <p>
                Account deletion requires review. Paid session and incident
                records may be retained under institutional policy.
              </p>
              <Field label="Type DELETE to confirm" pattern="DELETE" required />
              <button className={button}>Request Account Deletion</button>
            </form>
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
