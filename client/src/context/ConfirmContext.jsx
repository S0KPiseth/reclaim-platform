import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const ConfirmContext = createContext(null);

/**
 * Promise-based replacement for window.confirm, styled like the rest of the
 * app:  const ok = await confirm({ title, message, confirmLabel, tone });
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const confirmRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest({ ...options, resolve });
      }),
    [],
  );

  const close = useCallback((result) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!request) return;

    confirmRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [request, close]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgb(6_20_70/0.55)] px-4 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rc-confirm-title"
            className="rc-panel w-full max-w-[420px] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="rc-confirm-title"
              className="text-[20px] font-extrabold tracking-[-0.01em] text-ink"
            >
              {request.title ?? "Are you sure?"}
            </h2>
            {request.message && (
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{request.message}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => close(false)}>
                {request.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`rc-btn rc-btn-sm ${
                  request.tone === "danger" ? "rc-btn-danger" : ""
                }`}
                onClick={() => close(true)}
              >
                {request.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return context;
}
