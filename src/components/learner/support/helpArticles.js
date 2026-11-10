export const helpArticles = [
  {
    id: "about-kasangga",
    category: "Getting Started",
    title: "What is Kasangga?",
    steps: [
      "Kasangga connects CSU learners with student tutors offering academic subjects and services.",
      "Use your learner account to discover tutors, book sessions, pay through the available checkout and manage your learning activities.",
      "Students who want to tutor can apply through Profile. Tutor access becomes available after LCO approval.",
    ],
    view: "dashboard",
    action: "Open Dashboard",
  },
  {
    id: "switch-roles",
    category: "Getting Started",
    title: "How do I switch between Learner and Tutor?",
    steps: [
      "Use the Learner and Tutor tabs in the sidebar to switch roles.",
      "If you have an approved tutor role, the Tutor tab opens your tutor dashboard.",
      "If you are not approved yet, the Tutor tab shows your application status or an Apply as Tutor card. Complete the application and wait for LCO review.",
    ],
    view: "profile",
    action: "Open Profile",
  },
  {
    id: "verified-tutor",
    category: "Finding a Tutor",
    title: "What does Verified mean?",
    steps: [
      "A Verified Tutor has passed the tutor application review performed by an authorized LCO.",
      "Read the tutor profile, subjects, service details and reviews before choosing a service. Verification does not guarantee a particular academic result.",
      "Report a session-related concern through Report an Issue on the affected booking.",
    ],
    view: "find-tutor",
    action: "Find a Tutor",
  },
  {
    id: "call-tutor",
    category: "Messages",
    title: "Can I call my tutor?",
    steps: [
      "Kasangga supports text conversations for booking coordination. It does not provide built-in video or voice calls.",
      "For a booked online session, open My Sessions and choose Open External Meeting to use the meeting platform provided by the tutor.",
      "If you need a meeting link or have a scheduling question, message the tutor through the relevant booking conversation.",
    ],
    view: "messages",
    action: "Open Messages",
  },
  {
    id: "change-password",
    category: "Account & Security",
    title: "How do I change my password?",
    steps: [
      "Kasangga uses your CSU Google account for sign-in. Manage its password through your Google account.",
      "Follow the security instructions provided by Google or your university account LCO.",
      "Keep your password private and log out of shared devices.",
    ],
    view: "profile",
    action: "Open Profile",
  },
  {
    id: "identity-correction",
    category: "Account & Security",
    title: "How do I change my Student ID or email?",
    steps: [
      "Your name, Student ID and email are locked in Profile and the tutor application because they identify your student account.",
      "Contact Kasangga Support to explain the correction you need. Include the relevant account details without sharing passwords or verification codes.",
      "An authorized LCO must review corrections to institutional identity records. Other editable profile details can be updated in Profile.",
    ],
    view: "support",
    action: "Message Kasangga Support",
  },
  {
    id: "contact-support",
    category: "Account & Security",
    title: "How do I contact Kasangga Support?",
    steps: [
      "Choose Contact Support, then Message Kasangga Support, or open Messages and select the Kasangga Support conversation.",
      "Write a clear message about the issue. Include the affected page, relevant booking reference and what you expected to happen. Send the message to start or continue your private support conversation.",
      "Return to Kasangga Support in Messages to read LCO replies. Do not share passwords, OTPs or GCash MPINs. For a session incident, use Report an Issue on the affected session.",
    ],
    view: "support",
    action: "Message Kasangga Support",
  },
  {
    id: "complete-profile",
    category: "Getting Started",
    title: "How do I complete my learner profile?",
    steps: [
      "Open Complete Profile and upload your CSU Student ID for extraction. Review the extracted information and correct missing details before confirming it.",
      "Enter your Philippine mobile number, short bio, student interests, college, program and year level. Use Others to specify interests outside the checklist.",
      "Confirm that you reviewed the information, then select Save and Continue. Missing required information is shown as a warning.",
    ],
    view: "profile",
    action: "Open Profile",
  },
  {
    id: "dashboard",
    category: "Getting Started",
    title: "How do I use the dashboard?",
    steps: [
      "Use the sidebar to open Find a Tutor, My Sessions, Messages, Saved Tutors, Reviews, Profile or Help & Support.",
      "Search the top bar for tutors, subjects, topics, sessions and sections. Choose a result or submit your search to browse matching tutors.",
      "Some features remain locked until your learner profile is complete. Tutor features require an approved tutor application.",
    ],
    view: "dashboard",
    action: "Open Dashboard",
  },
  {
    id: "find-tutor",
    category: "Finding a Tutor",
    title: "How do I filter tutors?",
    steps: [
      "Open Find a Tutor or choose View all tutors on the dashboard.",
      "Use Subject, Session Type, Ratings and Price filters to narrow the list. Switch between list and grid using the View buttons.",
      "Open a tutor profile to read the bio, service details, session type and reviews. Unrated tutors have no ratings yet.",
    ],
    view: "find-tutor",
    action: "Find a Tutor",
  },
  {
    id: "save-tutor",
    category: "Finding a Tutor",
    title: "How do I save or remove a tutor?",
    steps: [
      "Click the bookmark icon on a tutor service card or select Save service in the tutor profile. A filled bookmark indicates a saved service.",
      "Open Saved Tutors to return to your saved services. Click the filled bookmark again to remove a service.",
      "Saved services are linked to your account. A service can become unavailable if it is no longer published.",
    ],
    view: "saved-tutors",
    action: "Open Saved Tutors",
  },
  {
    id: "book-session",
    category: "Booking Sessions",
    title: "How do I book a session?",
    steps: [
      "Choose Book Now on the service you want. The booking starts with topic selection; the selected service and subject are displayed above it.",
      "Choose a topic, then an available future date, duration and time. Add your sessions and select an offered session type.",
      "Review the tutor, topic, schedules and total. Confirm the review and payment consent before continuing to GCash via PayMongo.",
      "After payment, use Back to merchant. Booking Confirmed appears after the corresponding paid bookings are verified in Supabase.",
    ],
    view: "find-tutor",
    action: "Find a Tutor",
  },
  {
    id: "manage-sessions",
    category: "Booking Sessions",
    title: "Where are my upcoming, ongoing and completed sessions?",
    steps: [
      "Open My Sessions and choose Upcoming, Ongoing or Completed. Use the date and payment-status filters to narrow the cards.",
      "Open View Details for the booking reference, topic, time, amount and payment information.",
      "After the session ends, the tutor uploads completion proof. Review the proof under Ongoing, then confirm completion if the session was completed. You can rate your tutor immediately afterward.",
    ],
    view: "sessions",
    action: "Open My Sessions",
  },
  {
    id: "meeting",
    category: "Booking Sessions",
    title: "How do I join an online session?",
    steps: [
      "Open a confirmed online session in My Sessions and choose Open External Meeting.",
      "Check the tutor, service, schedule and platform in the confirmation card. Select Open to launch the meeting in a new tab.",
      "Kasangga does not host video calls. If the link is missing or cannot be opened, message your tutor using that booking.",
    ],
    view: "sessions",
    action: "Open My Sessions",
  },
  {
    id: "cancel-session",
    category: "Booking Sessions",
    title: "What is the cancellation policy?",
    steps: [
      "For an upcoming session, select Cancel Session on its card or in Session Details.",
      "Choose a reason, add useful notes and acknowledge the cancellation policy before confirming.",
      "Cancellation does not automatically guarantee a refund. A learner who does not attend the scheduled session is not eligible for a refund for their own absence. Refund eligibility is reviewed separately; payment status changes only when the corresponding payment or refund is verified.",
      "If the session has started or the cancellation is rejected, contact the tutor and use Report an Issue for a session-related concern.",
    ],
    view: "sessions",
    action: "Open My Sessions",
  },
  {
    id: "reschedule",
    category: "Booking Sessions",
    title: "Can I reschedule a session?",
    steps: [
      "Message your tutor using the relevant booking to discuss a different time. Where a Request Reschedule action is available, choose an offered slot and provide your reason.",
      "A request does not immediately change your booking. Keep the current schedule until the other participant accepts and the updated time is saved.",
      "Check My Sessions again for the confirmed date and time before joining.",
    ],
    view: "messages",
    action: "Open Messages",
  },
  {
    id: "payment",
    category: "Payments",
    title: "How do payments work?",
    steps: [
      "Booking checkout uses GCash through PayMongo. Review the sessions and total before authorizing payment.",
      "Return to Kasangga using Back to merchant after checkout. The confirmation card waits for the booking payment to be verified; a redirect alone does not confirm payment.",
      "Use View Details in My Sessions to inspect the amount, payment status and available transaction information.",
    ],
    view: "sessions",
    action: "Open My Sessions",
  },
  {
    id: "pending-payment",
    category: "Payments",
    title: "Why is my payment Pending?",
    steps: [
      "Allow time for payment verification when you return from PayMongo. Use Retry verification if the confirmation card asks you to retry.",
      "Check My Sessions for the corresponding booking and inspect the payment status. Avoid paying again while the original payment is still being verified.",
      "Keep your booking or transaction reference and the payment date and amount. For a session-related payment concern, use Report an Issue on that session. Never share your GCash MPIN, OTP or password.",
    ],
    view: "sessions",
    action: "Check My Sessions",
  },
  {
    id: "messages",
    category: "Messages",
    title: "How do I message my tutor?",
    steps: [
      "Choose Message Tutor on an eligible session card or open the booking conversation in Messages.",
      "Keep the booking reference and relevant schedule or subject details in your conversation. Session conversations depend on your access to that booking.",
      "Do not send passwords, OTPs, GCash MPINs or unnecessary personal information.",
    ],
    view: "messages",
    action: "Open Messages",
  },
  {
    id: "apply-tutor",
    category: "Tutor Application",
    title: "How do I become a tutor?",
    steps: [
      "Open Profile and select Apply as Tutor. Your student information is taken from your account and cannot be edited in the application.",
      "Enter the course code and description. Type each subject or area of expertise and click Add. Complete your bio, motivation and GCash payout reference details.",
      "Upload your current-semester COR and grades relevant to your subjects. You can attach up to 10 certificate or award files; PDF, JPG and PNG files must be at most 10 MB each. CSU ID upload is not required in this application.",
      "Review your application, confirm the certification and submit it. Continue shows warnings for missing information. Tutor access becomes available after LCO approval.",
    ],
    view: "application",
    action: "Apply as Tutor",
  },
  {
    id: "application-status",
    category: "Tutor Application",
    title: "How do I check or correct my tutor application?",
    steps: [
      "Open Profile to view your tutor application and its status.",
      "If LCO requests resubmission, read the requested changes, update the relevant information or documents and resubmit for review.",
      "The Tutor switch displays your application status while approval is pending. GCash details in the application are payout references for LCO; entering them does not enable automatic transfers.",
    ],
    view: "profile",
    action: "Open Profile",
  },
  {
    id: "review",
    category: "Reviews",
    title: "How do I leave or edit a review?",
    steps: [
      "Open a completed session in My Sessions and choose View Details, then Rate & Review.",
      "Choose a rating and describe your own experience respectfully. Save the review and check My Reviews for your submitted feedback.",
      "Where Edit Review is available, update your existing review rather than submitting another review for the same session.",
    ],
    view: "reviews",
    action: "Open My Reviews",
  },
  {
    id: "account-security",
    category: "Account & Security",
    title: "How do I update my account or password?",
    steps: [
      "Open Profile to update the available editable fields. Name, Student ID and email are locked; contact an authorized university LCO for corrections to those records.",
      "Manage your CSU Google account password through Google or your university account LCO.",
      "Use Logout when leaving a shared device. Never share your password, verification codes or GCash credentials.",
    ],
    view: "profile",
    action: "Open Profile",
  },
  {
    id: "report-issue",
    category: "Account & Security",
    title: "How do I report a session issue?",
    steps: [
      "Open the affected session under Upcoming, Ongoing or Completed and select Report an Issue.",
      "Choose an incident type, explain what happened and attach the requested evidence. Include accurate booking details without exposing passwords or payment credentials.",
      "Submit the report for authorized LCO review. Conduct concerns may be referred to OSWE; check Notifications for updates.",
    ],
    view: "sessions",
    action: "Open My Sessions",
  },
].sort((a, b) => {
  const categories = [
    "Getting Started",
    "Finding a Tutor",
    "Booking Sessions",
    "Payments",
    "Messages",
    "Tutor Application",
    "Reviews",
    "Account & Security",
  ];
  return categories.indexOf(a.category) - categories.indexOf(b.category);
});

export function filterHelpArticles(
  articles,
  query = "",
  category = "All Categories",
) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return articles.filter(
    (article) =>
      (category === "All Categories" || article.category === category) &&
      terms.every((term) =>
        [article.title, article.category, ...article.steps]
          .join(" ")
          .toLowerCase()
          .includes(term),
      ),
  );
}
