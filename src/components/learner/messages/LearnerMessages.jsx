// Messages: switches between tutor conversations and the persistent Kasangga Support conversation.
import BookingMessages from "../../shared/BookingMessages.jsx";
import LearnerSupportMessages from "./LearnerSupportMessages.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { chatTutorProfile } from "../../../services/chatTutorProfile.js";
export default function LearnerMessages() {
  const work = useLearnerWorkspace();
  const supportSelected = work.data.activeThread === "Kasangga Support";
  return (
    <div>
      <nav aria-label="Message conversations" className="mx-auto flex max-w-[1400px] gap-2 px-4 pt-3 lg:px-5">
        <button
          type="button"
          aria-pressed={!supportSelected}
          onClick={() => work.message({ name: "" })}
          className={`rounded-md border px-3 py-2 text-xs font-semibold ${!supportSelected ? "border-green-700 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-600"}`}
        >
          Tutor Conversations
        </button>
        <button
          type="button"
          aria-pressed={supportSelected}
          onClick={() => work.message({ name: "Kasangga Support" })}
          className={`rounded-md border px-3 py-2 text-xs font-semibold ${supportSelected ? "border-green-700 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-600"}`}
        >
          Kasangga Support
        </button>
      </nav>
      {supportSelected ? (
        <LearnerSupportMessages />
      ) : (
        <BookingMessages
          role="learner"
          onProfile={(data) => work.open("profile", chatTutorProfile(data))}
          initialName={work.data.activeThread || ""}
          initialBookingId={work.data.activeBookingId || ""}
        />
      )}
    </div>
  );
}
