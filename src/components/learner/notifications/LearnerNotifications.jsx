// Share the tutor notification layout while keeping learner data and navigation.
import Notifications from "../../tutor/workspace/Notifications.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
const data = { notifications: [] };
export default function LearnerNotifications() {
  const work = useLearnerWorkspace();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <Notifications
        role="learner"
        data={data}
        go={(view, args) => {
          if (view === "messages") work.message(args);
          else work.go(view, args);
        }}
      />
    </div>
  );
}
