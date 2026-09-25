import { useRef, useState } from 'react'
import {
  BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, ClipboardList,
  CreditCard, GraduationCap, LayoutDashboard, LogOut, Menu, Settings,
  ShieldCheck, TriangleAlert, UserCog, X,
} from 'lucide-react'
import useSidebarMenuScale from './useSidebarMenuScale'

const osasNavigation = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'User Management', icon: UserCog },
  { label: 'Tutor Verification', icon: ShieldCheck },
  { label: 'Service Management', icon: BriefcaseBusiness },
  { label: 'Bookings Monitoring', icon: CalendarDays },
  { label: 'Payments & Transactions', icon: CreditCard },
  { label: 'Incident Reports', icon: TriangleAlert },
  { label: 'Reports & Analytics', icon: ChartNoAxesCombined },
  { label: 'Audit Logs', icon: ClipboardList },
  { label: 'Settings', icon: Settings },
]


function NavigationItem({ item }) {
  const Icon = item.icon

  return (
    <a
      href={`#${item.label.toLowerCase().replaceAll(' ', '-')}`}
      className={`group flex h-[clamp(21px,4.4dvh,36px)] items-center gap-2.5 rounded-md px-4 text-[clamp(9px,1.5vw,12px)] font-medium transition-colors ${item.active
        ? 'bg-[#087542] text-white'
        : 'text-[#d9efe2] hover:bg-white/8 hover:text-white'}`}
    >
      <Icon className="h-[clamp(11px,1.8vw,16px)] w-[clamp(11px,1.8vw,16px)] shrink-0 stroke-[1.8]" aria-hidden="true" />
      <span>{item.label}</span>
      {item.badge && <span className="ml-auto grid h-4 w-4 place-items-center rounded-full bg-[#ffbf00] text-[9px] font-bold leading-none text-[#07502e]">{item.badge}</span>}
    </a>
  )
}

export default function OsasDashboard() {
  const [open, setOpen] = useState(false)
  const sidebarRef = useRef(null)
  const headerRef = useRef(null)
  const footerRef = useRef(null)
  const menuRef = useRef(null)
  const menuScale = useSidebarMenuScale(sidebarRef, headerRef, footerRef, menuRef)

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
      {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />}
      <aside ref={sidebarRef} className={`fixed left-0 top-0 z-40 flex h-dvh w-[min(248px,85vw)] flex-col overflow-hidden bg-[#005c35] shadow-[3px_0_16px_rgba(0,0,0,.12)] transition-transform duration-200 md:w-[248px] md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <header ref={headerRef} className="flex h-[clamp(44px,9dvh,76px)] shrink-0 items-center bg-[#004727] px-5">
          <GraduationCap className="h-[clamp(16px,3vw,24px)] w-[clamp(16px,3vw,24px)] text-[#ffc107]" strokeWidth={1.9} aria-hidden="true" />
          <span className="ml-2 text-[clamp(13px,2.4vw,19px)] font-semibold tracking-[-.6px] text-white">Campus<span className="text-[#ffc107]">Tutor</span></span>
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="ml-auto text-white/80 md:hidden"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div ref={menuRef} style={{ transform: `scale(${menuScale})`, transformOrigin: 'top left', width: menuScale < 1 ? `${100 / menuScale}%` : undefined }}>
          <nav className="px-3 py-[clamp(3px,1.8dvh,16px)]" aria-label="Main navigation">
             <p className="mb-[clamp(2px,1dvh,8px)] px-2 text-[clamp(7px,1.2vw,10px)] font-bold tracking-wide text-[#ffc107]">OSAS PORTAL</p>
            {osasNavigation.map((item) => <NavigationItem key={item.label} item={item} />)}
          </nav>

          <div className="mx-4 h-px bg-[#60a982]/30" />
          </div>
        </div>

        <section ref={footerRef} className="relative h-[clamp(62px,16dvh,188px)] shrink-0 overflow-hidden" aria-label="Caraga State University">
          <img src="/images/csubuilding.jpg" alt="Caraga State University building" className="absolute inset-0 h-full w-full object-cover object-[center_70%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#005c35] via-[#005c35]/45 to-[#003d24]/70" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-[clamp(5px,2dvh,16px)] text-white">
            <p className="text-[clamp(9px,1.8vw,14px)] font-bold leading-tight tracking-[-.2px] text-[#ffc107]">Caraga State University</p>
            <p className="mt-0.5 text-[clamp(7px,1.2vw,10px)] text-white/90">Excellence. Service. Commitment.</p>
          </div>
        </section>
      </aside>
    </>
  )
}
