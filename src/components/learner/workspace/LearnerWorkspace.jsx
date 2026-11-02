import ExternalMeeting from "../../shared/ExternalMeeting.jsx";
import { cancelLearnerSession } from "../../../services/learnerSessionActions.js";
import PaymentReturn from "./PaymentReturn.jsx";
// Learner workspace provider: coordinates learner profile, saved tutors, sessions, reviews, messages, and dialogs for all learner sections.
import { listLearnerSessions } from "../../../services/learnerSessions.js";
import { portalApi } from "../../../services/portalApi.js";
import {
  listLearnerReviews,
  saveLearnerReview,
} from "../../../services/learnerReviews.js";
import {
  listSavedTutors,
  persistSavedTutor,
  serviceKey,
} from "../../../services/savedTutors.js";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { workspaceProfile } from "../../../services/authAccount.js";
import ReviewDialog from "./ReviewDialog.jsx";
import LearnerReport from "./LearnerReport.jsx";
import SessionDialog from "./SessionDialog.jsx";
import TutorProfile from "./TutorProfile.jsx";
import BookingFlow from "./BookingFlow.jsx";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { Modal, button } from "../../tutor/workspace/ui.jsx";
import { useInteractions } from "../../shared/InteractionProvider.jsx";

const Context = createContext(null);
export const useLearnerWorkspace = () => useContext(Context);
const empty = {
  saved: [],
  sessions: [],
  reviews: [],
  threads: [],
  notifications: [],
  requests: [],
  profile: {},
  application: null,
};
export default function LearnerWorkspace({ children, go }) {
  const auth = useAuth();
  const [workspaceData, setData] = useState(() => ({
      ...structuredClone(empty),
      profile: {
        ...workspaceProfile(auth?.profile, auth?.user),
      },
    })),
    [dialog, setDialog] = useState(null),
    [error, setError] = useState("");
  const { toast, confirm } = useInteractions();
  const uid = auth?.user?.id;

  function closeDialog() {
    setDialog(null);
  }
  const [savedState, setSavedState] = useState({ uid: null, items: [] });
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");
  const [savingIds, setSavingIds] = useState([]);
  const pending = useRef(new Set());
  const generation = useRef(0);
  const account = useRef(uid);
  const data = {
    ...workspaceData,
    saved: savedState.uid === uid ? savedState.items : [],
  };
  const refreshSaved = useCallback(async () => {
    const current = ++generation.current;
    if (!uid) {
      setSavedLoading(false);
      return;
    }
    setSavedLoading(true);
    setSavedError("");
    try {
      const items = await listSavedTutors();
      if (current === generation.current) setSavedState({ uid, items });
    } catch (err) {
      if (current === generation.current) setSavedError(err.message);
    } finally {
      if (current === generation.current) setSavedLoading(false);
    }
  }, [uid]);
  useEffect(() => {
    account.current = uid;
    pending.current.clear();
    setSavingIds([]);
    refreshSaved();
    window.addEventListener("focus", refreshSaved);
    return () => {
      account.current = null;
      generation.current++;
      window.removeEventListener("focus", refreshSaved);
    };
  }, [refreshSaved, uid]);
  const [reviewsLoading, setReviewsLoading] = useState(true),
    [reviewsError, setReviewsError] = useState("");
  const reviewsRequest = useRef(0);
  const refreshReviews = useCallback(async () => {
    const current = ++reviewsRequest.current;
    if (!uid) return;
    try {
      const [sessions, reviews] = await Promise.all([
        listLearnerSessions(),
        listLearnerReviews(),
      ]);
      if (current === reviewsRequest.current) {
        setData((previous) => ({
          ...previous,
          sessions,
          reviews: reviews.map((review) => {
            const session = sessions.find(
              (item) => item.id === review.sessionId,
            );
            return { ...review, name: session?.name || "Tutor", session };
          }),
        }));
        setReviewsError("");
      }
    } catch (err) {
      if (current === reviewsRequest.current) setReviewsError(err.message);
    } finally {
      if (current === reviewsRequest.current) setReviewsLoading(false);
    }
  }, [uid]);
  useEffect(() => {
    setReviewsLoading(true);
    setData((previous) => ({ ...previous, sessions: [], reviews: [] }));
    refreshReviews();
    const timer = window.setInterval(refreshReviews, 15000);
    window.addEventListener("focus", refreshReviews);
    window.addEventListener("campustutor:sessions-changed", refreshReviews);
    return () => {
      reviewsRequest.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshReviews);
      window.removeEventListener(
        "campustutor:sessions-changed",
        refreshReviews,
      );
    };
  }, [refreshReviews]);
  useEffect(() => {
    if (
      !uid ||
      new URL(window.location.href).searchParams.get("payment") !== "cancelled"
    )
      return;
    let active = true;
    portalApi("discardUnpaidCheckout")
      .then(() => {
        if (!active) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        window.history.replaceState(null, "", url);
        refreshReviews();
      })
      .catch((error) => {
        if (active) toast(error.message);
      });
    return () => {
      active = false;
    };
  }, [uid, refreshReviews]);
  const isSaved = (tutor) =>
    !!serviceKey(tutor) &&
    data.saved.some((t) => serviceKey(t) === serviceKey(tutor));
  const isSaving = (tutor) => savingIds.includes(serviceKey(tutor));

  useEffect(() => {
    if (!auth?.profile) return;
    setData((previous) => ({
      ...previous,
      profile: {
        ...previous.profile,
        ...workspaceProfile(auth.profile, auth.user),
      },
    }));
  }, [auth?.profile, auth?.user]);
  function open(kind, record = {}) {
    setError("");
    if (kind === "application") {
      setDialog(null);
      go("application");
      return;
    }
    setDialog({ kind, record, step: 0 });
  }
  async function toggleSave(tutor) {
    const key = serviceKey(tutor);
    if (pending.current.has(key) || savedLoading) return;
    if (savedError) {
      toast("Reload Saved Tutors before changing your saves.");
      return;
    }
    const exists = isSaved(tutor);
    pending.current.add(key);
    setSavingIds([...pending.current]);
    try {
      await persistSavedTutor(tutor, !exists);
      if (account.current !== uid) return;
      generation.current++;
      setSavedLoading(false);
      setSavedState((previous) => ({
        uid,
        items: exists
          ? previous.items.filter((t) => serviceKey(t) !== key)
          : [tutor, ...previous.items.filter((t) => serviceKey(t) !== key)],
      }));
      toast(
        exists
          ? "Tutor removed from Saved Tutors."
          : "Tutor saved to your account.",
      );
    } catch (err) {
      if (account.current === uid) toast(err.message);
    } finally {
      if (account.current === uid) {
        pending.current.delete(key);
        setSavingIds([...pending.current]);
      }
    }
  }
  function message(tutor) {
    setData((d) => ({
      ...d,
      activeThread: tutor.name,
      activeBookingId: tutor.bookingId || "",
    }));
    go("messages");
    setDialog(null);
  }
  async function request(type, values) {
    if (type === "report") {
      const result = await portalApi("report", values);
      setDialog(null);
      toast(`Report ${result.id} submitted for LCO and OSWE review.`);
      return result;
    }
    throw new Error("Unsupported request type.");
  }

  const api = {
    // Sections share this account-scoped API instead of maintaining separate
    // copies of learner selections and conversation state.
    data,
    open,
    toggleSave,
    message,
    go,
    request,
    isSaved,
    isSaving,
    savedLoading,
    savedError,
    refreshSaved,
    reviewsLoading,
    reviewsError,
    refreshReviews,
  };
  const r = dialog?.record;
  return (
    <Context.Provider value={api}>
      {savedError && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-40 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-lg sm:left-auto sm:max-w-sm"
        >
          {savedError}{" "}
          <button onClick={refreshSaved} className="underline">
            Retry Saved Tutors
          </button>
        </div>
      )}
      {children}
      <PaymentReturn />
      {dialog && dialog.kind !== "application" && (
        <Modal
          size={
            dialog.kind === "profile"
              ? "profile"
              : dialog.kind === "book"
                ? "booking"
                : dialog.kind === "details"
                  ? "session-drawer"
                  : ["report", "review", "cancel", "meeting"].includes(
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
              cancel: "Cancel Session",
              meeting: "Open External Meeting",
              report: "Report an Issue",
              review:
                data.reviews.find((x) => x.sessionId === r.id) || r.review
                  ? "Edit Review"
                  : "Rate & Review Tutor",
              application: "Apply as Tutor",
              article: r?.title,
            }[dialog.kind] || dialog.kind
          }
          onClose={closeDialog}
        >
          {dialog.kind === "profile" && (
            <TutorProfile
              record={r}
              saved={isSaved(r)}
              saving={savedLoading || isSaving(r)}
              onSave={toggleSave}
              savedFor={isSaved}
              savingFor={isSaving}
              onMessage={message}
              onBook={(t) => open("book", t)}
            />
          )}
          {dialog.kind === "book" && (
            <BookingFlow tutor={r} onClose={closeDialog} />
          )}
          {["details", "cancel"].includes(dialog.kind) && (
            <SessionDialog
              key={dialog.kind}
              kind={dialog.kind}
              record={{
                ...r,
                review:
                  data.reviews.find((x) => x.sessionId === r.id) || r.review,
              }}
              onClose={closeDialog}
              onOpen={open}
              onMessage={message}
              onCancel={async ({ reason, notes, acknowledged }) => {
                await cancelLearnerSession(r, {
                  reason,
                  notes,
                  acknowledged,
                });
                window.dispatchEvent(new Event("campustutor:sessions-changed"));
                await refreshReviews();
                closeDialog();
                toast(
                  "Session cancelled. Refund eligibility will be reviewed separately.",
                );
              }}
            />
          )}
          {dialog.kind === "meeting" && (
            <ExternalMeeting
              service={r.course || r.subject}
              person={r.name}
              date={r.date}
              time={r.time}
              platform={r.platform || r.venue}
              link={r.link}
              active={
                r.canManage && !["Completed", "Cancelled"].includes(r.lifecycle)
              }
              onClose={closeDialog}
            />
          )}
          {dialog.kind === "report" && (
            <LearnerReport
              record={r}
              onClose={closeDialog}
              onSubmit={(values) => request("report", values)}
            />
          )}
          {dialog.kind === "review" && (
            <ReviewDialog
              record={r}
              review={
                data.reviews.find((x) => x.sessionId === r.id) || r.review
              }
              onClose={closeDialog}
              onSave={async (values) => {
                const saved = await saveLearnerReview(
                  r.bookingId || r.id,
                  values,
                );
                setData((previous) => ({
                  ...previous,
                  reviews: [
                    { ...saved, name: r.name, session: r },
                    ...previous.reviews.filter(
                      (item) => item.sessionId !== saved.sessionId,
                    ),
                  ],
                }));
                setDialog(null);
                toast("Review saved.");
                refreshReviews();
              }}
            />
          )}
          {dialog.kind === "article" && (
            <div className="space-y-3 text-sm">
              <p>{r.body}</p>
              <button
                className={button}
                onClick={() => message({ name: "Kasangga Support" })}
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
