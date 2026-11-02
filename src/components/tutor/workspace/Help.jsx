import { useState } from "react";
import {
  Search,
  CircleHelp,
  CalendarDays,
  Coins,
  ChartNoAxesColumnIncreasing,
  FileText,
  UsersRound,
  ShieldHalf,
  TriangleAlert,
  Headset,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Mail,
  Info,
} from "lucide-react";
import { Heading, Empty } from "./ui.jsx";
import ContactSupport from "./ContactSupport.jsx";
import "./help.css";
const guides = [
  {
    title: "Booking & Session Guidelines",
    icon: CalendarDays,
    summary: "Accept only valid bookings and keep session details current.",
    bullets: [
      "Learners book from your available tutoring times; confirmed classes and existing bookings block conflicts.",
      "A booking is confirmed after the learner's GCash payment through PayMongo succeeds.",
      "If you cannot attend, communicate promptly with the learner and use the available session actions. Refund eligibility is reviewed separately.",
      "Provide the external meeting link before online sessions.",
    ],
  },
  {
    title: "Payment & Fee Information",
    icon: Coins,
    summary: "Payments use GCash through PayMongo.",
    payment: true,
  },
  {
    title: "Tutor Earnings Allocation",
    icon: ChartNoAxesColumnIncreasing,
    summary:
      "Only eligible completed paid sessions contribute to Tutor earnings.",
    allocation: true,
    bullets: [
      "Upcoming paid sessions count once they are completed.",
      "Payments under refund review are excluded while their outcome is pending.",
    ],
  },
  {
    title: "Cancellation & Refund Policy",
    icon: FileText,
    summary:
      "Cancellation does not automatically guarantee a refund. If the learner does not attend the scheduled session, their absence does not qualify for a refund. Report attendance issues for LCO review.",
    bullets: [
      "Use the cancellation action where available and include a clear reason for the learner.",
      "Payment status changes only when a payment or refund is verified. Check Notifications for updates.",
      "For a session-related concern, open the relevant session and choose Report an Issue.",
    ],
  },
  {
    title: "Tutor Code of Conduct",
    icon: UsersRound,
    summary:
      "Be respectful, prepared, punctual, academically honest, and professional in every interaction.",
    bullets: [
      "Do not complete graded work for learners; guide them to understand it.",
      "Keep communication in Kasangga Messages.",
      "Start and end sessions on time.",
    ],
  },
  {
    title: "Safety Guidelines",
    icon: ShieldHalf,
    summary:
      "Protect account credentials, use approved public campus locations for in-person sessions, and avoid sharing unnecessary personal information.",
    bullets: [
      "Meet in approved public campus spaces.",
      "Never share your password or OTP, including with Kasangga staff.",
      "Report anything that makes you feel unsafe.",
    ],
  },
  {
    title: "Incident Reporting",
    icon: TriangleAlert,
    summary:
      "Report session-related incidents through Report an Issue in the relevant Session Details.",
    body: "Include accurate details and the required evidence. LCO reviews reports and refers conduct concerns to OSWE.",
    report: true,
  },
  {
    title: "Contact Support",
    icon: Headset,
    summary:
      "Need technical or account help? Contact the Kasangga support team.",
    body: "Send a private request to the LCO support inbox. Include the affected page and any booking reference. Never include passwords, OTPs or GCash MPINs.",
    contact: true,
  },
];
const faqs = [
  {
    question: "How do I update my tutoring availability?",
    answer:
      "Set the tutoring dates and times for your service topics in My Services, then review them in Availability & Schedule. Confirmed class times and existing bookings block conflicting slots.",
    view: "availability",
    action: "Open Availability & Schedule",
  },
  {
    question: "Where can I open an external meeting link?",
    answer:
      "Open My Sessions and select Open External Meeting on a confirmed online session. You can also use the meeting action in the booking conversation. Sessions run on an external platform such as Google Meet or Zoom; Kasangga has no built-in calling.",
    view: "sessions",
    action: "Open My Sessions",
  },
  {
    question: "How are Tutor earnings calculated?",
    answer:
      "Each eligible completed paid session is split 90% Tutor and 10% Platform (5% Maintenance and 5% Admin). For example, PHP 500 gross gives the tutor PHP 450. See Earnings for transaction details.",
    view: "earnings",
    action: "Open Earnings",
  },
];
const matches = (entry, query) =>
  JSON.stringify(entry).toLowerCase().includes(query.trim().toLowerCase());
const example = "\u20b1500 Gross = \u20b1450 Tutor + \u20b150 Platform";
function GuideCard({ guide, go, onContact }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = guide.icon;
  return (
    <section className="help-reference-card">
      <span className="help-reference-icon">
        <Icon size={25} />
      </span>
      <div className="help-reference-content">
        <button
          type="button"
          className="help-reference-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <h2>{guide.title}</h2>
          <ChevronDown
            size={16}
            className={expanded ? "help-chevron-open" : ""}
          />
        </button>
        <p>{guide.summary}</p>
        {expanded && (
          <>
            {guide.payment && (
              <>
                <div className="help-shares">
                  {[
                    ["Tutor Share", "90%"],
                    ["Platform Share", "10%"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>
                <p>{example}</p>
                <p>Booking Status and Payment Status are tracked separately.</p>
              </>
            )}
            {guide.allocation && (
              <div className="help-allocation">{example}</div>
            )}
            {guide.bullets && (
              <ul className="help-guide-list">
                {guide.bullets.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            )}
            {guide.body && <p className="help-extra">{guide.body}</p>}
            {guide.report && (
              <button
                type="button"
                className="help-session-link"
                onClick={() => go("sessions")}
              >
                <ExternalLink size={17} />
                Go to My Sessions
              </button>
            )}
            {guide.contact && (
              <button
                type="button"
                className="help-contact"
                onClick={onContact}
              >
                <Mail size={20} />
                Contact Support
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
export default function Help({ go, args = {} }) {
  const [query, setQuery] = useState(args.topic || "");
  const [contact, setContact] = useState(false);
  const faqRows = faqs.filter((faq) => matches(faq, query));
  return (
    <div className="help-reference">
      <Heading
        title="Help & Support"
        subtitle="Find guidance for tutoring, payments, conduct, and safe use of Kasangga."
      />
      <label className="help-reference-search">
        <Search size={19} />
        <input
          aria-label="Search tutor help topics"
          placeholder="Search help topics..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="help-reference-grid">
        <div className="help-reference-column">
          {!!faqRows.length && (
            <section className="help-reference-card">
              <span className="help-reference-icon">
                <CircleHelp size={25} />
              </span>
              <div className="help-reference-content">
                <h2>Frequently Asked Questions</h2>
                <div className="help-faq-list">
                  {faqRows.map((faq) => (
                    <details key={faq.question} open>
                      <summary>
                        <span>{faq.question}</span>
                        <ChevronDown size={16} />
                      </summary>
                      <p>{faq.answer}</p>
                      <button
                        type="button"
                        className="help-faq-link"
                        onClick={() => go(faq.view)}
                      >
                        {faq.action}
                        <ArrowRight size={15} />
                      </button>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}
          {guides
            .slice(0, 4)
            .filter((guide) => matches(guide, query))
            .map((guide) => (
              <GuideCard
                key={guide.title}
                guide={guide}
                go={go}
                onContact={() => setContact(true)}
              />
            ))}
        </div>
        <div className="help-reference-column">
          {guides
            .slice(4)
            .filter((guide) => matches(guide, query))
            .map((guide) => (
              <GuideCard
                key={guide.title}
                guide={guide}
                go={go}
                onContact={() => setContact(true)}
              />
            ))}
          <p className="help-reference-note">
            <Info size={16} />
            Kasangga provides internal text messaging only. Online sessions use
            external meeting links such as Google Meet or Zoom.
          </p>
        </div>
      </div>
      <Empty
        show={!faqRows.length && !guides.some((guide) => matches(guide, query))}
      />
      {contact && <ContactSupport onClose={() => setContact(false)} />}
    </div>
  );
}
