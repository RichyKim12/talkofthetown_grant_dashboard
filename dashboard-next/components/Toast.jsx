import React from "react";
import { IconCheck, IconAlert, IconSparkle, IconX } from "./icons";
import "../styles/Toast.css";

/* ============================================================
   TOAST NOTIFICATIONS
   Confirms that an action happened, since there's no other
   persistent feedback once a button finishes its async work.
   ============================================================ */

export function Toast({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role="status">
          <span className="toast-icon">
            {t.kind === "success" && <IconCheck width={18} height={18} />}
            {t.kind === "error" && <IconAlert width={18} height={18} />}
            {t.kind === "info" && <IconSparkle width={18} height={18} />}
          </span>
          <span className="toast-text">{t.text}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
            <IconX width={14} height={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook that owns toast state and exposes addToast/dismissToast.
 * Keeps the queue + auto-dismiss timer logic out of App.jsx.
 */
export function useToasts() {
  const [toasts, setToasts] = React.useState([]);

  const addToast = React.useCallback((text, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismissToast = React.useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
