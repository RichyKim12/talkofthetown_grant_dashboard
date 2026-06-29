import React, { useEffect, useRef } from "react";
import { IconX } from "./icons";
import "../styles/Layout.css";

/* ============================================================
   SHARED LAYOUT PRIMITIVES
   Small building blocks reused across every screen, so headers,
   empty states, modals, and form fields stay visually
   consistent without copy-pasting markup.
   ============================================================ */

export function ScreenHeader({ title, subtitle, right }) {
  return (
    <div className="screen-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }) {
  const Icon = icon;
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon width={28} height={28} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card${wide ? " modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <IconX width={20} height={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children, error, hint, wide }) {
  return (
    <div className={`field${wide ? " field-wide" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}
