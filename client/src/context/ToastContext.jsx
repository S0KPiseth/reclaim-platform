import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, AlertIcon, XIcon } from "../components/reclaim/icons";

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, tone = "success") => {
      const id = ++nextId;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      const timer = window.setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[120] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[14px] font-semibold shadow-[0_18px_40px_rgb(4_20_80/0.35)] backdrop-blur ${
              item.tone === "error"
                ? "border-[#ffc2d0] bg-[#fff3f6] text-[#b3123a]"
                : "border-white/40 bg-white/95 text-ink"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full ${
                item.tone === "error" ? "bg-[#ffe1e8]" : "bg-[#e3f9ee]"
              }`}
            >
              {item.tone === "error" ? <AlertIcon size={13} /> : <CheckIcon size={13} />}
            </span>
            <span className="flex-1 leading-snug">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="flex size-5 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-current opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
