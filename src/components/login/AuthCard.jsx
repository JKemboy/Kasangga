import { useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import AuthTabs from "./AuthTabs.jsx";
import InputField from "./InputField.jsx";
import SecurityNotice from "./SecurityNotice.jsx";

function GoogleMark() {
  return (
    <span
      className="text-[16px] font-bold"
      style={{
        fontFamily: "Arial, sans-serif",
        background:
          "conic-gradient(from -45deg, #4285f4 0 25%, #34a853 0 40%, #fbbc05 0 65%, #ea4335 0 82%, #4285f4 0)",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }}
    >
      G
    </span>
  );
}

export default function AuthCard() {
  const [active, setActive] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = active === "Login";
  return (
    <div className="mt-6 w-full max-w-[390px] overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-[0_6px_15px_rgba(0,0,0,.07)]">
      <div className="px-3 pb-2.5 pt-3 sm:px-4 sm:pb-3 sm:pt-3.5 lg:px-5 lg:pb-3.5 lg:pt-3">
        <header className="text-center">
          <h2 className="text-[18px] font-bold tracking-tight text-[#25262b] sm:text-[19px] lg:text-[20px]">
            {isLogin ? "Welcome back!" : "Create your account"}
          </h2>
          <p className="mt-0.5 text-[9px] text-[#96979e] sm:text-[10px]">
            {isLogin
              ? "Sign in to continue your learning journey."
              : "Join your CSU learning community."}
          </p>
        </header>
        <div className="mt-2">
          <AuthTabs active={active} onChange={setActive} />
        </div>
        <form
          className="mt-2 space-y-1.5 sm:mt-2.5 sm:space-y-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <InputField
            icon={Mail}
            label="CSU Email"
            type="email"
            placeholder="name@csu.edu.ph"
            aria-label="CSU Email"
          />
          <InputField
            icon={LockKeyhole}
            label="Password"
            hint={
              isLogin && (
                <a
                  href="#forgot"
                  className="text-[12px] font-medium text-[#197747]"
                >
                  Forgot Password?
                </a>
              )
            }
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            aria-label="Password"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#44464d]">
            <input
              className="h-3 w-3 rounded border-[#d9dadd] accent-[#006b3c]"
              type="checkbox"
            />
            Remember me
          </label>
          <button
            type="submit"
            className="h-8 w-full rounded-md bg-[#006b3c] text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#005932] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b3c]"
          >
            {isLogin ? "Continue with CSU Email" : "Register with CSU Email"}
          </button>
        </form>
        <div className="my-1.5 flex items-center gap-3 text-[10px] text-[#96979e] sm:my-2">
          <span className="h-px flex-1 bg-[#e9e9e9]" />
          or
          <span className="h-px flex-1 bg-[#e9e9e9]" />
        </div>
        <button
          type="button"
          className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[#a8c7b8] bg-white text-[11px] font-medium text-[#35363b] transition hover:bg-[#f8fbf9]"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </div>
      <SecurityNotice />
    </div>
  );
}
