import React, { useState } from "react";
import { ScreenHeader, EmptyState } from "../components/Layout";
import { ActionButton, Spinner } from "../components/ActionButton";
import { GrantCard, SkeletonGrantCard } from "../components/GrantCard";
import { IconSearch, IconSparkle } from "../components/icons";
import { discoverGrants } from "../utils/grantService";
import "../styles/Discover.css";

/* ============================================================
   DISCOVER & SELECT SCREEN
   Combines what used to be two separate steps: searching for
   grants and choosing which ones to write proposals for. The
   list the AI ranks is the same list the user checks boxes on
   — there's no second screen to navigate to or context to lose.
   ============================================================ */

export function DiscoverScreen({ profile, grants, setGrants, selectedIds, setSelectedIds, onFoundGrants, addToast, goProposals }) {
  const [phase, setPhase] = useState(grants.length ? "done" : "idle"); // idle | searching | ranking | done
  const [progressMsg, setProgressMsg] = useState("");

  const focusPreview = profile.focuses.slice(0, 4);
  const extraCount = Math.max(0, profile.focuses.length - focusPreview.length);

  const runDiscovery = async () => {
    if (profile.focuses.length === 0) {
      addToast("Add at least one focus area in your profile before searching.", "error");
      return;
    }
    setPhase("searching");
    try {
      const ranked = await discoverGrants(profile, (msg) => {
        setPhase((prev) => (prev === "searching" && msg.startsWith("Ranking") ? "ranking" : prev));
        setProgressMsg(msg);
      });
      setGrants(ranked);
      setPhase("done");
      onFoundGrants();
      addToast(`Found ${ranked.length} matching grants`, "success");
    } catch (err) {
      setPhase("idle");
      addToast("Couldn't complete the search. Try again.", "error");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        addToast("You can select up to 5 grants at a time to keep drafts manageable.", "info");
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div className="screen">
      <ScreenHeader
        title="Discover & select grants"
        subtitle="The AI searches public grant sources and ranks results against your organization profile. Check the box on any grant you'd like a proposal draft for."
      />

      <div className="panel discover-panel">
        <div className="discover-row">
          <div className="discover-context">
            <p className="discover-context-label">Searching using your saved focus areas</p>
            <div className="chip-row">
              {focusPreview.map((f) => (
                <span className="static-chip" key={f}>
                  {f}
                </span>
              ))}
              {extraCount > 0 && <span className="static-chip static-chip-muted">+{extraCount} more</span>}
            </div>
          </div>
          <ActionButton
            onPress={runDiscovery}
            busyText={phase === "searching" ? "Searching…" : "Ranking…"}
            variant="primary"
            size="lg"
            icon={<IconSparkle width={18} height={18} />}
          >
            {grants.length ? "Search again" : "Find grants"}
          </ActionButton>
        </div>
        {(phase === "searching" || phase === "ranking") && (
          <div className="progress-line" role="status" aria-live="polite">
            <Spinner size={16} />
            <span>{progressMsg}</span>
          </div>
        )}
      </div>

      {phase === "idle" && grants.length === 0 && (
        <EmptyState
          icon={IconSearch}
          title="No grants found yet"
          body="Click “Find grants” to search public grant listings and rank them against your organization's values and focus areas."
        />
      )}

      {(phase === "searching" || phase === "ranking") && (
        <div className="grant-list">
          <SkeletonGrantCard />
          <SkeletonGrantCard />
          <SkeletonGrantCard />
        </div>
      )}

      {phase === "done" && grants.length > 0 && (
        <>
          <div className="results-meta">
            <div>
              <h3>Top {grants.length} matches</h3>
              <p>Ranked by relevance to your organization's focus areas and values.</p>
            </div>
            <span className="select-summary">{selectedIds.length} of 5 selected</span>
          </div>
          <div className="grant-list">
            {grants.map((g, i) => (
              <GrantCard key={g.id} grant={g} rank={i + 1} selected={selectedIds.includes(g.id)} onToggleSelect={toggleSelect} />
            ))}
          </div>
          <div className="discover-footer">
            <ActionButton
              onPress={async () => {
                if (selectedIds.length === 0) {
                  addToast("Select at least one grant first.", "error");
                  return;
                }
                await new Promise((r) => setTimeout(r, 200));
                goProposals();
              }}
              variant="primary"
              size="lg"
              icon={<IconSparkle width={18} height={18} />}
            >
              Write proposals for {selectedIds.length || ""} selected grant{selectedIds.length === 1 ? "" : "s"}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}
