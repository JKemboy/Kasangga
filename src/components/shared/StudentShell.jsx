import {useLogout} from "./LogoutProvider.jsx";
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {GraduationCap,LogOut,Menu,Bell,MessageCircle} from 'lucide-react';
import {Avatar} from '../tutor/workspace/ui.jsx';
export default function StudentShell({role,nav,view,go,name='Juan Dela Cruz',unread=0,searchContent}){
 const requestLogout = useLogout();

 const navigate=useNavigate();const [open,setOpen]=useState(false);
 function select(id){go(id);setOpen(false);}
 return <>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[230px] flex-col bg-[#00542f] text-white transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-2 bg-[#003e24] px-5">
          <GraduationCap className="h-8 w-8 text-amber-400" />
          <span className="text-xl font-semibold">
            Campus<span className="text-amber-400">{role === "tutor" ? "Tutor" : "Learner"}</span>
          </span>
        </div>
        <div className="mx-4 my-3 flex rounded-lg bg-black/15 text-xs">
          <button
            aria-pressed={role === "learner"}
            className={`flex-1 rounded-lg py-2 ${role === "learner" ? "bg-amber-400 font-semibold text-black" : ""}`}
            onClick={() => navigate("/learner-dashboard")}
          >
            Learner
          </button>
          <button aria-pressed={role === "tutor"} onClick={() => navigate("/tutor-dashboard")} className={`flex-1 rounded-lg py-2 ${role === "tutor" ? "bg-amber-400 font-semibold text-black" : ""}`}>Tutor</button>
        </div>
        <nav
          aria-label={`${role === "tutor" ? "Tutor" : "Learner"} navigation`}
          className="relative z-10 min-h-0 overflow-y-auto"
        >
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              className={`flex w-full items-center gap-3 border-l-4 px-5 py-[clamp(7px,1.35dvh,12px)] text-left text-xs ${view === id ? "border-amber-400 bg-white/10 font-semibold text-yellow-300" : "border-transparent hover:bg-white/10"}`}
              onClick={() => select(id)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
          <button
            className="mx-4 mt-3 flex w-[calc(100%-32px)] items-center gap-3 border-t border-white/20 py-4 text-xs"
            onClick={requestLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
        <div className="relative mt-auto min-h-20 flex-1 overflow-hidden">
          <img
            src="/images/csubuilding.jpg"
            alt="Caraga State University"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#00542f] via-[#00542f]/20 to-[#003e24]" />
          <div className="absolute bottom-4 px-5">
            <p className="font-serif text-base text-amber-300">
              Caraga State University
            </p>
            <p className="mt-1 text-[9px]">Excellence. Service. Commitment.</p>
          </div>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-20 flex h-[64px] items-center gap-3 border-b border-slate-100 bg-white px-4 md:left-[230px] lg:px-6">
        <button
          aria-label="Open navigation"
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
        {searchContent}
        <div className="ml-auto flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="relative"
            onClick={() => select("notifications")}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 rounded-full bg-green-800 px-1 text-[9px] text-white">
              {unread}
            </span>
          </button>
          <button aria-label="Messages" onClick={() => select("messages")}>
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            className="flex items-center gap-2"
            onClick={() => select("profile")}
            aria-label="Open profile"
          >
            <Avatar name={name} />
            <span className="hidden text-left text-xs lg:block">
              <b>{name}</b>
              <span className="block text-slate-500">Tutor</span>
            </span>
          </button>
        </div>
      </header>
</>;
}
