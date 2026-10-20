import { useAuth } from "../../auth/AuthProvider.jsx";
import { createContext, useContext, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";

const LogoutContext = createContext(null);
export const useLogout = () => useContext(LogoutContext);

export default function LogoutProvider({ children }) {
  const auth = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await auth.signOut();
      setOpen(false);
      window.location.replace("/login");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const previousFocus = useRef(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      previousFocus.current?.focus();
    }
  }, [open]);
  const close = () => setOpen(false);
  return (
    <LogoutContext.Provider
      value={() => {
        previousFocus.current = document.activeElement;
        setOpen(true);
      }}
    >
      {children}
      {createPortal(
        <dialog
          ref={dialog}
          onCancel={close}
          aria-labelledby="logout-title"
          aria-describedby="logout-description"
          className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-[480px] rounded-lg border-0 bg-white p-7 text-center text-[#101638] shadow-xl backdrop:bg-black/55"
        >
          <button
            type="button"
            aria-label="Close logout confirmation"
            onClick={close}
            className="absolute right-4 top-4 rounded p-1 focus-visible:outline"
          >
            <X size={19} />
          </button>
          <div className="mx-auto mb-4 grid h-[72px] w-[72px] place-items-center rounded-full bg-red-50 text-red-600">
            <LogOut size={36} />
          </div>
          <h2 id="logout-title" className="text-[22px] font-bold leading-tight">
            Are you sure you want to log out?
          </h2>
          <p
            id="logout-description"
            className="mt-2 text-base leading-snug text-[#52618b]"
          >
            You will need to sign in again to access your Kasangga account.
          </p>
          <p className="mt-3 text-sm leading-snug text-[#52618b]">
            Your saved services, schedules, messages, and session records will
            remain secure.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              autoFocus
              type="button"
              onClick={close}
              className="rounded-md border border-[#26365c] px-4 py-2.5 font-medium focus-visible:outline"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={logout}
              className="flex items-center justify-center gap-2 rounded-md bg-[#c8242c] px-4 py-2.5 font-semibold text-white hover:bg-red-800"
            >
              <LogOut size={21} />
              Logout
            </button>
          </div>
        </dialog>,
        document.body,
      )}
    </LogoutContext.Provider>
  );
}
