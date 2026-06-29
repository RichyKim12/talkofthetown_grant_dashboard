import React, { useState, useRef, useEffect } from "react";
import "../styles/Buttons.css";

/* ============================================================
   SPINNER + ACTION BUTTON

   ActionButton is the core anti-spam-click primitive: it owns
   its own "busy" state, so any onPress handler that returns a
   promise automatically disables the button and shows a spinner
   until that promise resolves. No screen needs to remember to
   wire this up manually.
   ============================================================ */

export function Spinner({ size = 18 }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Button that prevents double/spam submission while an async
 * action runs. Pass an onPress that returns a promise (or is
 * async) — the button disables itself and shows busyText with
 * a spinner until it resolves, then re-enables automatically.
 */
export function ActionButton({
  onPress,
  children,
  busyText,
  variant = "primary",
  icon,
  fullWidth,
  size = "md",
  disabled,
  ...rest
}) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => (mounted.current = false), []);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onPress();
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <button
      className={`btn btn-${variant} btn-${size}${fullWidth ? " btn-full" : ""}${busy ? " btn-busy" : ""}`}
      onClick={handleClick}
      disabled={busy || disabled}
      aria-busy={busy}
      {...rest}
    >
      {busy ? (
        <>
          <Spinner size={size === "lg" ? 20 : 16} />
          <span>{busyText || "Working…"}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
