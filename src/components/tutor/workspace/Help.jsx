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
  ExternalLink,
  Mail,
  Info,
} from "lucide-react";
import "./help.css";
import { useState } from "react";
import {
  Heading,
  Modal,
  Field,
  button,
  primary,
  input,
  matches,
  Empty,
} from "./ui.jsx";
const guides = [
  [
    "Booking & Session Guidelines",
    "Accept only valid bookings, keep session details current, and use Request Reschedule when a time change is needed.",
    "Open My Sessions to inspect booking and payment status separately. A local request draft does not change the confirmed booking.",
  ],
  [
    "Payment & Fee Information",
    "Payments use GCash through PayMongo.",
    "Tutor 90% | OSAS 5% | Platform 5%. Booking Status and Payment Status are tracked separately.",
  ],
  [
    "Tutor Earnings Allocation",
    "Only eligible completed paid sessions contribute to Tutor earnings.",
    "₱500 Gross = ₱450 Tutor + ₱25 OSAS + ₱25 Platform",
  ],
  [
    "Cancellation & Refund Policy",
    "Cancellation does not automatically guarantee a refund. Refund eligibility is reviewed separately under CampusTutor policy.",
    "Use Session Details to cancel a local demo session. No real refund is initiated.",
  ],
  [
    "Tutor Code of Conduct",
    "Be respectful, prepared, punctual, academically honest, and professional in every interaction.",
    "Guide students toward understanding. Do not complete assessed work for them.",
  ],
  [
    "Safety Guidelines",
    "Protect account credentials, use approved public campus locations for in-person sessions, and avoid sharing unnecessary personal information.",
    "Do not include passwords or payment credentials in messages or reports.",
  ],
  [
    "Incident Reporting",
    "Report session-related incidents through Report an Issue in the relevant Session Details.",
    "Include accurate details and evidence when available. OSAS reviews submitted reports. Local drafts are not submitted.",
  ],
  [
    "Contact Support",
    "Need technical or account help? Contact the CampusTutor support team.",
    "Support hours: Monday – Friday · 8:00 AM–5:00 PM",
  ],
];
const faqs = [
  [
    "How do I update my tutoring availability?",
    "Open Availability & Schedule, choose Tutoring Availability, then Add Availability. New times are checked against classes, unavailable time, and confirmed bookings.",
  ],
  [
    "Where can I open an external meeting link?",
    "Open My Sessions and use Open External Meeting on a confirmed online session. Sample sessions have no live meeting URL configured.",
  ],
  [
    "How are Tutor earnings calculated?",
    "Only completed paid sessions are included. Tutor share is 90%, OSAS is 5%, and platform share is 5%.",
  ],
];
const guideIcons = [
  CalendarDays,
  Coins,
  ChartNoAxesColumnIncreasing,
  FileText,
  UsersRound,
  ShieldHalf,
  TriangleAlert,
  Headset,
];
function GuideCard({ guide, index, go, onContact }) {
  const [expanded, setExpanded] = useState([1, 6].includes(index));
  const [title, summary, body] = guide;
  const Icon = guideIcons[index];
  return (
    <section className="help-reference-card">
      <span className="help-reference-icon">
        <Icon size={25} strokeWidth={1.9} />
      </span>
      <div className="help-reference-content">
        <button
          className="help-reference-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <h2>{title}</h2>
          <ChevronDown
            size={16}
            className={expanded ? "help-chevron-open" : ""}
          />
        </button>
        <p>{summary}</p>
        {index === 1 && expanded && (
          <>
            <div className="help-shares">
              {[
                ["Tutor Share", "90%"],
                ["OSAS Share", "5%"],
                ["Platform Share", "5%"],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
            <p>Booking Status and Payment Status are tracked separately.</p>
          </>
        )}
        {index === 2 && (
          <div className="help-allocation">
            ?500 Gross = ?450 Tutor + ?25 OSAS + ?25 Platform
          </div>
        )}
        {expanded && ![1, 2, 7].includes(index) && (
          <p className="help-extra">
            {index === 6
              ? "Include accurate details and evidence when available. OSAS reviews submitted reports."
              : body}
          </p>
        )}
        {index === 6 && expanded && (
          <button className="help-session-link" onClick={() => go("sessions")}>
            <ExternalLink size={17} />
            Go to My Sessions
          </button>
        )}
        {index === 7 && (
          <>
            <button className="help-contact" onClick={onContact}>
              <Mail size={20} />
              Contact Support
            </button>
            <p className="help-hours">
              Support hours: Monday ? Friday ? 8:00 AM ? 5:00 PM
            </p>
            {expanded && (
              <p className="help-extra">
                Prepare a support request using the contact form. Requests are
                saved locally until delivery services are connected.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
export default function Help({ update, go, args = {} }) {
  const [query, setQuery] = useState(args.topic || ""),
    [contact, setContact] = useState(false),
    [sent, setSent] = useState(false);
  const rows = guides.filter((g) => matches(g, query));
  return (
    <div className="help-reference">
      <Heading
        title="Help & Safety"
        subtitle="Find guidance for tutoring, payments, conduct, and safe use of CampusTutor."
      />
      <label className="help-reference-search">
        <Search size={19} />
        <input
          aria-label="Search help topics"
          placeholder="Search help topics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="help-reference-grid">
        <div className="help-reference-column">
          {faqs.some((f) => matches(f, query)) && (
            <section className="help-reference-card">
              <span className="help-reference-icon">
                <CircleHelp size={25} />
              </span>
              <div className="help-reference-content">
                <h2>Frequently Asked Questions</h2>
                <div className="help-faq-list">
                  {faqs
                    .filter((f) => matches(f, query))
                    .map(([q, a]) => (
                      <details key={q}>
                        <summary>
                          <span>{q}</span>
                          <ChevronDown size={16} />
                        </summary>
                        <p>{a}</p>
                      </details>
                    ))}
                </div>
              </div>
            </section>
          )}
          {guides.slice(0, 4).map(
            (guide, index) =>
              matches(guide, query) && (
                <GuideCard
                  key={guide[0]}
                  guide={guide}
                  index={index}
                  go={go}
                  onContact={() => {
                    setContact(true);
                    setSent(false);
                  }}
                />
              ),
          )}
        </div>
        <div className="help-reference-column">
          {guides.slice(4).map(
            (guide, index) =>
              matches(guide, query) && (
                <GuideCard
                  key={guide[0]}
                  guide={guide}
                  index={index + 4}
                  go={go}
                  onContact={() => {
                    setContact(true);
                    setSent(false);
                  }}
                />
              ),
          )}
          <p className="help-reference-note">
            <Info size={16} />
            CampusTutor provides internal text only messaging. Online sessions
            use external Google Meet or Zoom links.
          </p>
        </div>
      </div>
      <Empty show={!rows.length && !faqs.some((f) => matches(f, query))} />
      {contact && (
        <Modal title="Contact Support" onClose={() => setContact(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const values = Object.fromEntries(new FormData(e.currentTarget));
              const saved=update((d) => ({
                ...d,
                reports: [
                  ...d.reports,
                  {
                    ...values,
                    id: crypto.randomUUID(),
                    type: "support",
                    created: new Date().toISOString(),
                  },
                ],
              }));
              setSent(saved!==false);
            }}
          >
            <p className="text-xs">
              Support delivery is not connected. Save your request as a local
              draft.
            </p>
            <Field label="Subject" name="subject" required maxLength={150} />
            <Field label="Details">
              <textarea
                name="details"
                required
                maxLength={3000}
                className={`${input} h-28`}
              />
            </Field>
            <button className={primary}>Save Support Draft</button>
            {sent && (
              <p role="status" className="text-xs">
                Draft saved locally. It has not been sent.
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
