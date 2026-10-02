import { Ban } from "lucide-react";
import { createContext, useContext, useRef, useState } from "react";
import { Modal, button, primary } from "../tutor/workspace/ui.jsx";

const Context = createContext(null);
export const useInteractions = () => useContext(Context);

// UI-only orchestration. Domain mutations stay in each workspace's update adapter.
export default function InteractionProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const [message, setMessage] = useState("");
  const pending = useRef(null);
  const timer = useRef(null);
  function finish(value) {
    pending.current?.(value);
    pending.current = null;
    setPrompt(null);
  }
  function confirm(options) {
    pending.current?.(false);
    return new Promise((resolve) => {
      pending.current = resolve;
      setPrompt(options);
    });
  }
  function toast(text) {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), 5000);
  }
  return (
    <Context.Provider value={{ confirm, toast }}>
      {children}
      {prompt && (
        <Modal
          size={prompt.presentation === "service" ? "small" : "default"}
          title={prompt.title}
          onClose={() => finish(false)}
        >
          <div
            className={
              prompt.presentation === "service"
                ? "service-status-confirm"
                : undefined
            }
          >
            {prompt.presentation === "service" && (
              <span className="service-status-icon">
                <Ban size={28} />
              </span>
            )}
            <p className="text-sm text-slate-600">{prompt.message}</p>
          </div>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              finish(true);
            }}
          >
            {prompt.acknowledgement && (
              <label className="flex gap-2 text-xs">
                <input type="checkbox" required />
                {prompt.acknowledgement}
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button
                autoFocus
                type="button"
                className={button}
                onClick={() => finish(false)}
              >
                {prompt.cancel || "Cancel"}
              </button>
              <button
                className={
                  prompt.danger
                    ? `${button} border-red-600 bg-red-600 text-white hover:bg-red-700`
                    : primary
                }
              >
                {prompt.accept || "Confirm"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {message && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-4 rounded-lg border border-green-200 bg-white p-3 text-sm text-green-900 shadow-lg"
        >
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
