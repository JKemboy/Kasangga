import LearnerSearch from "../components/learner/workspace/LearnerSearch.jsx";
import LearnerWorkspace from "../components/learner/workspace/LearnerWorkspace.jsx";
import LearnerOverview from "../components/learner/dashboard/LearnerOverview.jsx";
import TutorApplication from "../components/learner/application/TutorApplication.jsx";
import { useState } from "react";
import StudentShell from "../components/shared/StudentShell.jsx";
import { learnerNav } from "../components/learner/learnerNavigation.js";
import LearnerMessages from "../components/learner/messages/LearnerMessages.jsx";
import LearnerProfile from "../components/learner/profiles/LearnerProfile.jsx";
import LearnerFindTutor from "../components/learner/find-tutors/LearnerFindTutor.jsx";
import LearnerHelpSupport from "../components/learner/support/LearnerHelpSupport.jsx";
import LearnerSessions from "../components/learner/sessions/LearnerSessions.jsx";
import LearnerSavedTutors from "../components/learner/saved-tutors/LearnerSavedTutors.jsx";
import LearnerReviews from "../components/learner/reviews/LearnerReviews.jsx";
import LearnerNotifications from "../components/learner/notifications/LearnerNotifications.jsx";

export default function Dashboard() {
  const [view, setView] = useState("dashboard");
  const [viewArgs, setViewArgs] = useState({});
  function navigate(nextView, args = {}) {
    setView(nextView);
    setViewArgs(args);
  }

  return (
    <LearnerWorkspace go={navigate}>
      <div className="min-h-screen bg-[#f7faf8]">
        <StudentShell
          role="learner"
          nav={learnerNav}
          view={view}
          go={navigate}
          searchContent={<LearnerSearch go={navigate} />}
        />
        <main
          id="messages"
          className="min-h-screen bg-[#fbfcfe] pt-[64px] md:ml-[230px]"
          aria-label="Dashboard content"
        >
          {view === "dashboard" && <LearnerOverview go={setView} />}
          {view === "messages" && <LearnerMessages />}
          {view === "profile" && <LearnerProfile />}

          {view === "application" && (
            <TutorApplication onClose={() => setView("profile")} />
          )}
          {view === "find-tutor" && (
            <LearnerFindTutor
              key={viewArgs.query || ""}
              query={viewArgs.query || ""}
            />
          )}
          {view === "help-support" && <LearnerHelpSupport />}
          {view === "sessions" && <LearnerSessions args={viewArgs} />}
          {view === "saved-tutors" && <LearnerSavedTutors />}
          {view === "reviews" && <LearnerReviews />}
          {view === "notifications" && <LearnerNotifications />}
        </main>
      </div>
    </LearnerWorkspace>
  );
}
