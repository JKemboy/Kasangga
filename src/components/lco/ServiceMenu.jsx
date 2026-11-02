import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  UserRound,
  CalendarDays,
  Pencil,
  Ban,
} from "lucide-react";
import { button } from "../tutor/workspace/ui.jsx";
export default function ServiceMenu({ service, onSelect, options }) {
  const [pos, setPos] = useState(null);
  const trigger = useRef(null),
    menu = useRef(null);
  useEffect(() => {
    if (!pos) return;
    menu.current?.querySelector("button")?.focus();
    const close = (e) => {
      if (
        !menu.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setPos(null);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        setPos(null);
        trigger.current?.focus();
      }
    };
    const scroll = () => setPos(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [pos]);
  return (
    <>
      <button
        ref={trigger}
        className={button}
        aria-label={`Actions for ${service.title}`}
        aria-expanded={!!pos}
        onClick={() => {
          if (pos) {
            setPos(null);
            return;
          }
          const r = trigger.current.getBoundingClientRect();
          setPos({
            top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 205)),
            left: Math.max(8, Math.min(r.right - 235, window.innerWidth - 243)),
          });
        }}
      >
        <MoreVertical size={16} />
      </button>
      {pos &&
        createPortal(
          <div
            ref={menu}
            style={pos}
            className="fixed z-50 w-[235px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {(
              options || [
                [UserRound, "View tutor account", "account"],
                [CalendarDays, "View bookings", "bookings"],
                ...(service.status === "Active"
                  ? [[Ban, "Suspend service", "Suspend Service"]]
                  : service.status === "Suspended"
                    ? [[Ban, "Lift suspension", "Lift Suspension"]]
                    : []),
              ]
            ).map(([Icon, label, action]) => (
              <button
                key={action}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs hover:bg-slate-50 ${action === "Suspend Service" ? "text-red-600" : ""}`}
                onClick={() => {
                  setPos(null);
                  onSelect(action);
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
