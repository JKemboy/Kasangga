import BookingMessages from "../../shared/BookingMessages.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { chatTutorProfile } from "../../../services/chatTutorProfile.js";
export default function LearnerMessages() {
  const work = useLearnerWorkspace();
  return (
    <BookingMessages
      role="learner"
      onProfile={(data) => work.open("profile", chatTutorProfile(data))}
      initialName={work.data.activeThread || ""}
      initialBookingId={work.data.activeBookingId || ""}
    />
  );
}
