import React from "react";
import { IconBuilding, IconSearch, IconFile, IconCheck } from "./icons";
import "../styles/Sidebar.css";

/* ============================================================
   NAVIGATION STEPS
   Three stops now that Discover and Select are merged:
   Profile -> Discover & select -> Proposal drafts.
   Order matters here — it's a real sequence the user moves
   through, not an arbitrary menu.
   ============================================================ */

export const STEPS = [
  { key: "profile", label: "Organization profile", icon: IconBuilding },
  { key: "discover", label: "Discover & select grants", icon: IconSearch },
  { key: "proposals", label: "Proposal drafts", icon: IconFile },
];

export function ProgressSteps({ current, onJump, completed }) {
  return (
    <nav className="step-nav" aria-label="Dashboard sections">
      {STEPS.map((step) => {
        const isActive = step.key === current;
        const isDone = completed.has(step.key) && !isActive;
        const Icon = step.icon;
        return (
          <button
            key={step.key}
            className={`step-item${isActive ? " step-active" : ""}${isDone ? " step-done" : ""}`}
            onClick={() => onJump(step.key)}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="step-icon-wrap">
              {isDone ? <IconCheck width={16} height={16} /> : <Icon width={18} height={18} />}
            </span>
            <span className="step-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
