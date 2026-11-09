import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ArrowRight } from "lucide-react";
import { button, input } from "../shared/staffUi.jsx";
export default function OverviewMonth({ value, onChange, onReports }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null),
    trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const calendarValue = /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
      })
        .format(new Date())
        .split("/")
        .reverse()
        .join("-");
  const [year, month] = calendarValue.split("-").map(Number),
    first = new Date(year, month - 1, 1),
    days = new Date(year, month, 0).getDate();
  return (
    <div className="ocx-month" ref={ref}>
      <button
        ref={trigger}
        className={button}
        aria-expanded={open}
        aria-label="Overview month"
        onClick={() => setOpen(!open)}
      >
        <CalendarDays size={17} />
        {value
          ? first.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          : "All dates"}
        <ChevronDown size={15} />
      </button>
      {open && (
        <section className="ocx-calendar" aria-label="Overview calendar">
          <label>
            Overview month
            <input
              className={input}
              type="month"
              value={value || calendarValue}
              min="2024-01"
              max="2099-12"
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className={button}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            All dates
          </button>
          <div className="ocx-calendar-grid">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <b key={"d" + i}>{d}</b>
            ))}
            {Array.from({ length: first.getDay() }, (_, i) => (
              <span key={"b" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <p>Overview reflects the selected month’s database records.</p>
          {onReports && (
            <button
              className={button}
              onClick={() => {
                setOpen(false);
                onReports();
              }}
            >
              Past periods in Reports & Analytics <ArrowRight size={15} />
            </button>
          )}
        </section>
      )}
    </div>
  );
}
