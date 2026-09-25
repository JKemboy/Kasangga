import { useRef, useState } from "react";
import {
  BadgeCheck,
  Boxes,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clock3,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

const topics = [
  [BadgeCheck, "Becoming a Tutor"],
  [Boxes, "Creating Services"],
  [CalendarDays, "Managing Availability"],
  [CalendarCheck, "Student Requests"],
  [CalendarCheck, "Managing Sessions"],
  [Wallet, "Earnings & Payouts"],
  [Star, "Reviews & Ratings"],
  [MessageCircle, "Messages"],
  [ShieldCheck, "Account & Security"],
];
const field =
  "mt-2 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs text-[#253455] outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/10";
export default function TutorHelpSupport() {
  const fileInput = useRef(null);
  const subjectInput = useRef(null);
  const [attachment, setAttachment] = useState(null);
  const [notice, setNotice] = useState("");
  function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "application/pdf"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setNotice("Choose a PNG, JPG, or PDF file no larger than 5 MB.");
      event.target.value = "";
      setAttachment(null);
      return;
    }
    setAttachment(file);
    setNotice("");
  }
  return (
    <section className="mx-auto max-w-[1500px] px-4 py-4 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
        Help &amp; Support
      </h1>
      <p className="mt-2 text-xs font-medium text-[#253455]">
        Find answers to common questions or get in touch with our support team.
      </p>
      <div className="mt-4 grid items-start gap-5 xl:grid-cols-[1.18fr_1fr]">
        <section className="rounded-xl border border-[#e4e8ef] bg-white p-4 lg:p-5">
          <h2 className="text-sm font-bold">Frequently Asked Questions</h2>
          <label className="relative mt-4 block">
            <span className="sr-only">Search help topics</span>
            <input
              type="search"
              placeholder="Search help topics..."
              className={`${field} mt-0 h-10 pr-10`}
            />
            <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#253455]" />
          </label>
          <div className="mt-2 space-y-1.5">
            {topics.map(([Icon, title]) => (
              <button
                key={title}
                type="button"
                className="flex min-h-10 w-full items-center gap-3 rounded-lg border border-[#edf0f4] bg-white px-3 py-2 text-left hover:bg-slate-50"
              >
                <span className="rounded-md bg-[#f0f8f1] p-1 text-[#086b20]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-xs font-semibold text-[#101828]">
                  {title}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#253455]" />
              </button>
            ))}
          </div>
          <p className="mb-2 mt-7 text-xs text-[#45516e]">
            Still need help?{" "}
            <button
              type="button"
              onClick={() => subjectInput.current?.focus()}
              className="font-semibold text-[#173a9b] hover:underline"
            >
              Contact our support team.
            </button>
          </p>
        </section>
        <section className="rounded-xl border border-[#e4e8ef] bg-white p-4 lg:p-5">
          <h2 className="text-sm font-bold">Contact Support</h2>
          <p className="mt-2 text-xs leading-5 text-[#45516e]">
            Can't find what you need? Send us a message and we'll get back to
            you.
          </p>
          <form
            className="mt-4 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice(
                "Your request has not been sent. Support submission is not connected yet.",
              );
            }}
          >
            <label className="block text-xs font-semibold text-[#15213f]">
              Subject
              <input
                ref={subjectInput}
                name="subject"
                required
                maxLength={150}
                placeholder="Enter the subject"
                className={`${field} h-10`}
              />
            </label>
            <label className="block text-xs font-semibold text-[#15213f]">
              Category
              <select
                name="category"
                required
                defaultValue=""
                className={`${field} h-10`}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {topics.map(([, title]) => (
                  <option key={title}>{title}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#15213f]">
              Description
              <textarea
                name="description"
                required
                maxLength={5000}
                placeholder="Please describe your concern in detail..."
                className={`${field} min-h-24 resize-y py-3`}
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-[#15213f]">
                Attachment (optional)
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={chooseFile}
                  className="hidden"
                  aria-label="Support attachment"
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex h-9 items-center gap-2 rounded-md border border-[#dfe5ed] px-3 text-xs font-medium text-[#45516e]"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach File
                </button>
                <span className="text-[11px] text-[#727c99]">
                  PNG, JPG, PDF (Max. 5MB)
                </span>
              </div>
              {attachment && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="min-w-0 break-all">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      fileInput.current.value = "";
                    }}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#07651e] text-xs font-semibold text-white hover:bg-[#065219]"
            >
              <Send className="h-4 w-4" />
              Submit Request
            </button>
            {notice && (
              <p role="status" className="text-xs text-[#45516e]">
                {notice}
              </p>
            )}
          </form>
          <div className="mt-6 rounded-lg border border-[#d7ebdc] bg-[#f3faf5] p-3">
            <h3 className="flex items-center gap-2 text-xs font-medium text-green-800">
              <Clock3 className="h-4 w-4" />
              Support Hours
            </h3>
            <p className="mt-2 text-xs text-[#45516e]">
              Monday - Friday: 8:00 AM - 5:00 PM
            </p>
            <p className="mt-2 text-xs text-[#45516e]">
              We typically respond within 24 hours.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
