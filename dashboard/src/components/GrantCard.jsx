import React, { useState } from "react";
import { IconClock, IconCheck, IconChevronDown } from "./icons";
import { formatDate, daysUntil } from "../utils/formatters";
import "../styles/GrantCard.css";

/* ============================================================
   GRANT CARD
   Used in the merged Discover & select screen. Selection is
   built in (not a separate screen) — the checkbox at the
   bottom is how the user builds their shortlist as they browse.
   ============================================================ */

export function ScoreBadge({ score }) {
  const tier = score >= 90 ? "high" : score >= 75 ? "mid" : "low";
  return (
    <div className={`score-badge score-${tier}`}>
      <span className="score-num">{score}</span>
      <span className="score-label">match</span>
    </div>
  );
}

export function GrantCard({ grant, rank, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft = daysUntil(grant.deadline);

  return (
    <div className={`grant-card${selected ? " grant-card-selected" : ""}`}>
      <div className="grant-rank">#{rank}</div>
      <div className="grant-card-main">
        <div className="grant-card-top">
          <div>
            <h3 className="grant-name">{grant.name}</h3>
            <p className="grant-funder">{grant.funder}</p>
          </div>
          <ScoreBadge score={grant.score} />
        </div>

        <p className="grant-summary">{grant.summary}</p>

        <div className="grant-meta-row">
          <span className="meta-pill">
            ${grant.amountMin.toLocaleString()}–${grant.amountMax.toLocaleString()}
          </span>
          <span className={`meta-pill${daysLeft <= 14 ? " meta-pill-urgent" : ""}`}>
            <IconClock width={13} height={13} /> Due {formatDate(grant.deadline)}
            {daysLeft <= 21 && daysLeft > 0 ? ` · ${daysLeft}d left` : ""}
          </span>
          <span className="meta-pill meta-pill-muted">via {grant.source}</span>
        </div>

        <div className="chip-row">
          {grant.matchedFocuses.map((f) => (
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
              <p>{grant.eligibility}</p>
            </div>
            <div>
              <strong>Application requirements</strong>
              <ul>
                {grant.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <a href={grant.sourceUrl} target="_blank" rel="noreferrer" className="link-btn">
              View original listing on {grant.source}
            </a>
          </div>
        )}

        <div className="grant-select-row">
          <label className="checkbox-row">
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(grant.id)} />
            <span>Select this grant to write a proposal</span>
          </label>
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
