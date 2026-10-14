import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, LockKeyhole } from "lucide-react";
import { button } from "./ui.jsx";
import { time } from "./data.js";
export default function AvailabilityPopover({
  selection,
  onClose,
  onEdit,
  onDelete,
}) {
  const ref = useRef(null),
    [position, setPosition] = useState({ left: 16, top: 100 });
  const { event, date, rect } = selection;
  useLayoutEffect(() => {
    const box = ref.current.getBoundingClientRect();
    setPosition({
      left: Math.max(
        12,
        Math.min(
          rect?.left ?? window.innerWidth / 2 - 130,
          window.innerWidth - box.width - 12,
        ),
      ),
      top: Math.max(
        12,
        Math.min(
          rect?.bottom ? rect.bottom + 6 : 120,
          window.innerHeight - box.height - 12,
        ),
      ),
    });
    ref.current.querySelector("button")?.focus();
  }, [selection]);
  useEffect(() => {
    const outside = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  const editable = !!event.slot;
  return createPortal(
    <section
      ref={ref}
      role="dialog"
      aria-label="Calendar block details"
      style={position}
      className="availability-popover"
    >
      <button
        className="availability-popover-close"
        aria-label="Close block details"
        onClick={onClose}
      >
        <X size={14} />
      </button>
      <span
        className={`availability-popover-badge ${event.conflict ? "conflict" : ""}`}
      >
        {event.kind === "class" ? (
          <>
            <LockKeyhole size={12} /> Class Schedule — Blocked
          </>
        ) : event.conflict ? (
          "Conflicts with class"
        ) : event.kind === "available" ? (
          "Available for Tutoring"
        ) : (
          "Protected Time"
        )}
      </span>
      <strong>
        {event.kind === "class"
          ? `${event.title} · ${event.detail}`
          : date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
      </strong>
      <p>
        {time(event.start)} – {time(event.end)}
        {event.kind === "available" && event.slot.serviceName
          ? ` · ${event.slot.serviceName}`
          : ""}
      </p>
      {event.room && <p className="session-muted">{event.room}</p>}
      {event.conflict && (
        <p className="text-red-700">
          This time cannot be booked. Update or remove this block.
        </p>
      )}
      {editable ? (
        <div className="grid gap-2 mt-3">
          <button className={button} onClick={() => onEdit(event.slot, date)}>
            Update Availability
          </button>
          <button
            className="rounded border border-red-200 px-2 py-1 text-red-600"
            onClick={() => onDelete(event.slot)}
          >
            Remove Availability
          </button>
        </div>
      ) : (
        <>
          <p className="session-muted">
            {event.kind === "class"
              ? "Class blocks are read-only here. Changes go through Upload Updated Class Schedule."
              : "This protected time is locked."}
          </p>
        </>
      )}
    </section>,
    document.body,
  );
}
