// Learner sidebar registry: maps each visible section label to the route key and icon used by the learner dashboard.
import {
  Home,
  Search,
  CalendarDays,
  MessageCircle,
  Bookmark,
  Star,
  Bell,
  UserRound,
  CircleHelp,
} from "lucide-react";
// Keep learner sidebar entries in one registry so labels, icons, and section
// keys stay aligned with the LearnerDashboard navigation callbacks.
export const learnerNav = [
  ["dashboard", "Dashboard", Home],
  ["find-tutor", "Find a Tutor", Search],
  ["sessions", "My Sessions", CalendarDays],
  ["messages", "Messages", MessageCircle],
  ["saved-tutors", "Saved Tutors", Bookmark],
  ["reviews", "My Reviews", Star],
  ["notifications", "Notifications", Bell],
  ["profile", "Profile", UserRound],
  ["help-support", "Help & Support", CircleHelp],
];
