import "./tutor-modals.css";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
export const button =
  "rounded-md border border-green-700 px-2.5 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400";
export const primary =
  button.replace("text-green-800", "text-white") +
  " bg-green-800 hover:bg-green-900";
export const input =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#253455]";
export function Badge({ children }) {
  return (
    <span
      className={`inline-block rounded px-3 py-1 text-[10px] font-semibold ${["Suspended", "Cancelled", "Unpaid"].includes(children) ? "bg-red-50 text-red-600" : ["Pending", "Unconfirmed"].includes(children) ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-800"}`}
    >
      {children}
    </span>
  );
}
export function Avatar({ name }) {
  return (
    <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-50 to-slate-200 text-xs font-bold text-green-800">
      {name
        .split(" ")
        .slice(0, 2)
        .map((s) => s[0])
        .join("")}
    </span>
  );
}
export function Panel({ title, children, action }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Heading({ title, subtitle, action }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-1 text-xs text-[#45516e]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export const TutorModalContext = createContext(false);
export function Modal({
  title,
  children,
  onClose,
  subtitle,
  footer,
  size = "default",
}) {
  const tutor = useContext(TutorModalContext);
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={
        tutor
          ? `tutor-modal tutor-modal--${size}`
          : `workspace-modal ${size === "profile" ? "learner-profile-modal " : size === "booking" ? "learner-booking-modal " : size === "session-drawer" ? "learner-session-drawer " : size === "session-modal" ? "learner-session-modal " : size === "account" ? "learner-account-modal " : ""}m-auto max-h-[85dvh] w-[min(600px,94vw)] overflow-y-auto rounded-xl p-3 shadow-xl backdrop:bg-black/40`
      }
    >
      <div
        className={
          tutor ? "tutor-modal-header" : "mb-2 flex justify-between gap-3"
        }
      >
        <div>
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="tutor-modal-subtitle">{subtitle}</p>}
        </div>
        <button type="button" aria-label="Close dialog" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className={tutor ? "tutor-modal-body" : undefined}>{children}</div>
      {footer && <div className="tutor-modal-footer">{footer}</div>}
    </dialog>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      {children || <input {...props} className={input} />}
    </label>
  );
}
export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-[11px]">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-2 text-[10px] font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
export function Pager({ count, page, setPage, size = 5 }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <footer className="mt-2 flex flex-wrap justify-between gap-3 text-xs">
      <p>
        Showing {count ? Math.min((page - 1) * size + 1, count) : 0}–
        {Math.min(page * size, count)} of {count}
      </p>
      <nav aria-label="Pagination" className="flex gap-1">
        <button
          className={button}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            aria-current={page === i + 1 ? "page" : undefined}
            className={page === i + 1 ? primary : button}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button
          className={button}
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </nav>
    </footer>
  );
}
export function useFilterPage() {
  const [page, setPage] = useState(1);
  return [page, setPage];
}
export const matches = (value, query) =>
  query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((word) => JSON.stringify(value).toLowerCase().includes(word));
export function Empty({ show }) {
  return show ? (
    <p role="status" className="p-3 text-center text-sm text-slate-500">
      No matching results.
    </p>
  ) : null;
}
