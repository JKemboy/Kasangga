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
  const [search, setSearch] = useState("");
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
          searchContent={
            <div className="relative w-full max-w-lg">
              <input
                aria-label="Search learner sections"
                placeholder="Search learner sections..."
                className="h-8 w-full rounded-md border border-slate-200 px-3 text-xs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search.trim() && (
                <div className="absolute mt-1 w-full rounded border bg-white p-2 shadow-lg">
                  {learnerNav
                    .filter(([, label]) =>
                      label.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map(([id, label]) => (
                      <button
                        key={id}
                        className="block w-full p-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          navigate(id);
                          setSearch("");
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  {!learnerNav.some(([, label]) =>
                    label.toLowerCase().includes(search.toLowerCase()),
                  ) && <p className="p-2 text-xs">No matching sections.</p>}
                </div>
              )}
            </div>
          }
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
          {view === "find-tutor" && <LearnerFindTutor />}
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
