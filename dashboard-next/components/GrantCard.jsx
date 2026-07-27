import React, { useState } from "react";
import { IconClock, IconCheck, IconChevronDown } from "./icons";
import { formatDate, daysUntil } from "../utils/formatters";
import "../styles/GrantCard.css";

export function ScoreBadge({ score }) {
  const tier = score >= 90 ? "high" : score >= 75 ? "mid" : "low";
  return (
    <div className={`score-badge score-${tier}`}>
      <span className="score-num">{score}</span>
      <span className="score-label">match</span>
    </div>
  );
}

export function GrantCard({ grant, rank, selected, onToggleSelect, onNotInterested }) {
  const [expanded, setExpanded] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const daysLeft = daysUntil(grant.deadline);

  const destinationUrl = grant.sourceUrl;

  // Check if there is an active fee vs. free/none
  const rawFee = grant.applicationFee?.trim();
  const hasFee = rawFee && rawFee.toLowerCase() !== "none" && rawFee.toLowerCase() !== "free" && rawFee !== "$0";

  const handleMuteClick = async () => {
    if (isMuting) return;
    setIsMuting(true);
    await onNotInterested?.(grant.id);
    setIsMuting(false);
  };

  return (
    <div className={`grant-card${selected ? " grant-card-selected" : ""}`}>
      <div className="grant-rank">#{rank}</div>
      
      <div className="grant-card-main">
        <div className="grant-card-top">
          <div style={{ flex: 1 }}>
            {/* Title & Fee Pill Header Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <h3 className="grant-name" style={{ margin: 0 }}>
                <a 
                  href={destinationUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: "inherit", 
                    textDecoration: "underline",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary-color, #2563eb)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "inherit"; }}
                >
                  {grant.title || grant.name || "Untitled Grant Opportunity"} ↗
                </a>
              </h3>

              {/* Title Fee Badge */}
              <span 
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  backgroundColor: hasFee ? "#fef2f2" : "#f0fdf4",
                  color: hasFee ? "#dc2626" : "#16a34a",
                  border: `1px solid ${hasFee ? "#fca5a5" : "#86efac"}`
                }}
              >
                {hasFee ? `App Fee: ${rawFee}` : "No Application Fee"}
              </span>
            </div>

            <p className="grant-funder" style={{ marginTop: "0.25rem" }}>{grant.funder || grant.source}</p>
          </div>
          {/* <ScoreBadge score={grant.score || grant.matchScore} /> */}
        </div>

        <p className="grant-summary">{grant.summary}</p>

        {/* Updated Meta Row (App Fee pill removed from here to prevent redundancy) */}
        <div className="grant-meta-row">
          <span className="meta-pill">
            ${grant.amountMin?.toLocaleString() || "0"}–${grant.amountMax?.toLocaleString() || "0"}
          </span>

          <span className={`meta-pill${daysLeft <= 14 ? " meta-pill-urgent" : ""}`}>
            <IconClock width={13} height={13} /> Due {formatDate(grant.deadline)}
            {daysLeft <= 21 && daysLeft > 0 ? ` · ${daysLeft}d left` : ""}
          </span>
          
          <a 
            href={destinationUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="meta-pill meta-pill-muted"
            style={{ textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            via {grant.source} ↗
          </a>
        </div>

        <div className="chip-row">
          {grant.matchedFocuses?.map((f) => (
            <span className="match-chip" key={f}>
              {f}
            </span>
          ))}
        </div>

        <button className="link-btn" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? "Hide details" : "View eligibility and requirements"}
          <IconChevronDown
            width={14}
            height={14}
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}
          />
        </button>

        {expanded && (
          <div className="grant-details">
            <div>
              <strong>Eligibility</strong>
              <p>{grant.eligibility || "Refer to original listing document rules."}</p>
            </div>
            <div>
              <strong>Application requirements</strong>
              <ul>
                {grant.requirements?.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Application fee</strong>
              <p>{hasFee ? rawFee : "None (Free)"}</p>
            </div>
            <a 
              href={destinationUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="link-btn"
              style={{ fontWeight: "600", marginTop: "4px" }}
            >
              View original listing on {grant.source} ↗
            </a>
          </div>
        )}

        {/* Noticeable "Not Interested" pill styled button action panel row */}
        <div className="grant-select-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border, #e5e7eb)" }}>
          <label className="checkbox-row" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(grant.id)} />
            <span style={{ marginLeft: "0.5rem" }}>Select this grant to write a proposal</span>
          </label>

          <button
            type="button"
            className="mute-action-btn"
            disabled={isMuting}
            onClick={handleMuteClick}
            style={{
              color: isMuting ? "#9ca3af" : "#dc2626",
              backgroundColor: isMuting ? "#f3f4f6" : "#fef2f2",
              border: `1px solid ${isMuting ? "#e5e7eb" : "#fca5a5"}`,
              borderRadius: "6px",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: isMuting ? "not-allowed" : "pointer",
              padding: "6px 12px",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center"
            }}
            onMouseEnter={(e) => { 
              if (!isMuting) {
                e.currentTarget.style.backgroundColor = "#fee2e2";
                e.currentTarget.style.borderColor = "#ef4444";
              }
            }}
            onMouseLeave={(e) => { 
              if (!isMuting) {
                e.currentTarget.style.backgroundColor = "#fef2f2";
                e.currentTarget.style.borderColor = "#fca5a5";
              }
            }}
          >
            {isMuting ? (
              <>
                <span style={{ marginRight: "6px" }}>⏳</span> Muting...
              </>
            ) : (
              "✕ Not Interested"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrantCard() {
  return (
    <div className="grant-card skeleton-card" aria-hidden="true">
      <div className="skel skel-rank" />
      <div className="grant-card-main">
        <div className="skel skel-line" style={{ width: "55%", height: 18 }} />
        <div className="skel skel-line" style={{ width: "30%", height: 13, marginTop: 8 }} />
        <div className="skel skel-line" style={{ width: "90%", height: 13, marginTop: 14 }} />
        <div className="skel skel-line" style={{ width: "75%", height: 13, marginTop: 6 }} />
      </div>
    </div>
  );
}