import SidebarLogo from "../../shared/SidebarLogo.jsx";
import { useLogout } from "../../shared/LogoutProvider.jsx";
import { useRef, useState } from "react";
import {
  Archive,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  CircleUserRound,
  FileText,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import useSidebarMenuScale from "../../shared/useSidebarMenuScale.js";

const osasNavigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Case Review", icon: FileText },
  { label: "Student Clearance Review", icon: IdCard },
  { label: "Policies & Procedures", icon: BookOpen },
  { label: "Case Archive", icon: Archive },
  { label: "Reports & Analytics", icon: ChartNoAxesCombined },
  { label: "Settings", icon: Settings },
];

function NavigationItem({ item }) {
  const Icon = item.icon;

  return (
    <a
      href={`#${item.label.toLowerCase().replaceAll(" ", "-")}`}
      className={`group flex h-[clamp(21px,4.4dvh,36px)] items-center gap-2.5 rounded-md px-4 text-[clamp(9px,1.5vw,12px)] font-medium transition-colors ${
        item.active
          ? "bg-[#087542] text-white"
          : "text-[#d9efe2] hover:bg-white/8 hover:text-white"
      }`}
    >
      <Icon
        className="h-[clamp(11px,1.8vw,16px)] w-[clamp(11px,1.8vw,16px)] shrink-0 stroke-[1.8]"
        aria-hidden="true"
      />
      <span>{item.label}</span>
      {item.badge && (
        <span className="ml-auto grid h-4 w-4 place-items-center rounded-full bg-[#ffbf00] text-[9px] font-bold leading-none text-[#07502e]">
          {item.badge}
        </span>
      )}
    </a>
  );
}

export default function OsasDashboard() {
  const requestLogout = useLogout();

  const [open, setOpen] = useState(false);
  const [activeTopMenu, setActiveTopMenu] = useState(null);
  const sidebarRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const menuRef = useRef(null);
  const menuScale = useSidebarMenuScale(
    sidebarRef,
    headerRef,
    footerRef,
    menuRef,
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-md bg-[#004b2b] text-white shadow-md md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 z-40 flex h-dvh w-[min(248px,85vw)] flex-col overflow-hidden bg-[#005c35] shadow-[3px_0_16px_rgba(0,0,0,.12)] transition-transform duration-200 md:w-[248px] md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <header
          ref={headerRef}
          className="flex h-[clamp(44px,9dvh,76px)] shrink-0 items-center bg-[#004727] px-5"
        >
          <SidebarLogo />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="ml-auto text-white/80 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            ref={menuRef}
            style={{
              transform: `scale(${menuScale})`,
              transformOrigin: "top left",
              width: menuScale < 1 ? `${100 / menuScale}%` : undefined,
            }}
          >
            <nav
              className="px-3 py-[clamp(3px,1.8dvh,16px)]"
              aria-label="Main navigation"
            >
              <p className="mb-[clamp(2px,1dvh,8px)] px-2 text-[clamp(7px,1.2vw,10px)] font-bold tracking-wide text-[#ffc107]">
                OSAS PORTAL
              </p>
              {osasNavigation.map((item) => (
                <NavigationItem key={item.label} item={item} />
              ))}
            </nav>

            <div className="mx-4 h-px bg-[#60a982]/30" />
            <nav
              className="px-3 py-[clamp(3px,1.4dvh,12px)]"
              aria-label="OSAS session"
            >
              <NavigationItem
                item={{ label: "Logout", icon: LogOut }}
                onClick={requestLogout}
              />
            </nav>
          </div>
        </div>

        <section
          ref={footerRef}
          className="relative h-[clamp(62px,16dvh,188px)] shrink-0 overflow-hidden"
          aria-label="Caraga State University"
        >
          <img
            src="/images/csubuilding.jpg"
            alt="Caraga State University building"
            className="absolute inset-0 h-full w-full object-cover object-[center_70%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#005c35] via-[#005c35]/45 to-[#003d24]/70" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-[clamp(5px,2dvh,16px)] text-white">
            <p className="text-[clamp(9px,1.8vw,14px)] font-bold leading-tight tracking-[-.2px] text-[#ffc107]">
              Caraga State University
            </p>
            <p className="mt-0.5 text-[clamp(7px,1.2vw,10px)] text-white/90">
              Excellence. Service. Commitment.
            </p>
          </div>
        </section>
      </aside>
      <header
        className="fixed left-0 right-0 top-0 z-20 flex h-[58px] items-center border-b border-[#e8edf2] bg-white px-4 shadow-[0_1px_4px_rgba(15,23,42,.04)] sm:px-6 md:left-[248px]"
        aria-label="OSAS top navigation"
      >
        <label
          className="relative ml-11 block w-full max-w-[285px] md:ml-0"
          aria-label="Search tutors, subjects, or topics"
        >
          <input
            type="search"
            placeholder="Search tutors, subjects, or topics..."
            className="h-8 w-full rounded-md border border-[#dfe5ec] bg-white py-1 pl-3 pr-9 text-[10px] text-slate-700 outline-none focus:border-[#087542] focus:ring-2 focus:ring-[#087542]/15"
          />
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6080]" />
        </label>
        <div className="ml-auto flex items-center gap-3 text-[#53627b] sm:gap-4">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={activeTopMenu === "notifications"}
            onClick={() =>
              setActiveTopMenu(
                activeTopMenu === "notifications" ? null : "notifications",
              )
            }
            className="relative grid h-8 w-6 place-items-center"
          >
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute right-[-3px] top-[-3px] grid h-3 w-3 place-items-center rounded-full bg-[#087542] text-[7px] font-bold text-white">
              3
            </span>
          </button>
          <button
            type="button"
            aria-label="Messages"
            aria-expanded={activeTopMenu === "messages"}
            onClick={() =>
              setActiveTopMenu(activeTopMenu === "messages" ? null : "messages")
            }
            className="grid h-8 w-5 place-items-center"
          >
            <MessageCircle className="h-[17px] w-[17px]" />
          </button>
          <div className="hidden h-6 w-px bg-[#edf0f3] sm:block" />
          <button
            type="button"
            aria-label="Open account menu"
            aria-expanded={activeTopMenu === "account"}
            onClick={() =>
              setActiveTopMenu(activeTopMenu === "account" ? null : "account")
            }
            className="flex items-center gap-2 text-left"
          >
            <CircleUserRound
              className="h-7 w-7 text-[#aeb5bf]"
              fill="#edf0f2"
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-[10px] font-semibold text-[#2d3748]">
                Juan Dela Cruz
              </span>
              <span className="block text-[9px] text-[#79869a]">
                OSAS Staff
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-[#286ee8] sm:block" />
          </button>
        </div>
        {activeTopMenu === "notifications" && (
          <div className="absolute right-[116px] top-[52px] w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:right-[182px]">
            <p className="text-xs font-semibold text-slate-800">
              Notifications
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              You have 3 new notifications.
            </p>
          </div>
        )}
        {activeTopMenu === "messages" && (
          <div className="absolute right-[78px] top-[52px] w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:right-[142px]">
            <p className="text-xs font-semibold text-slate-800">Messages</p>
            <p className="mt-2 text-[11px] text-slate-500">
              You have 2 unread messages.
            </p>
          </div>
        )}
        {activeTopMenu === "account" && (
          <div className="absolute right-4 top-[52px] w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-[11px] text-slate-700 hover:bg-slate-50"
            >
              My Profile
            </button>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-[11px] text-slate-700 hover:bg-slate-50"
            >
              Settings
            </button>
            <button
              type="button"
              className="w-full border-t border-slate-100 px-3 py-2 text-left text-[11px] text-red-600 hover:bg-red-50"
              onClick={requestLogout}
            >
              Logout
            </button>
          </div>
        )}
      </header>
    </>
  );
}
