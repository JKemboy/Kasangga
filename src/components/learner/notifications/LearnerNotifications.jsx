// Share the tutor notification layout while keeping learner data and navigation.
import Notifications from "../../tutor/workspace/Notifications.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
const data = { notifications: [] };
export default function LearnerNotifications({ args = {} }) {
  const work = useLearnerWorkspace();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <Notifications
        role="learner"
        args={args}
        data={data}
        go={(view, args) => {
          if (view === "messages")
            work.message({ ...args, name: args.name || args.learner });
          else work.go(view, args);
        }}
      />
    </div>
  );
}
