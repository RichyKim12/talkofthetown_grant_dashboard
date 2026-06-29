"use client";

import React, { useState } from "react";
import { ScreenHeader, EmptyState } from "../Layout";
import { ActionButton, Spinner } from "../ActionButton";
import { GrantCard, SkeletonGrantCard } from "../GrantCard";
import { IconSearch } from "../icons";

export function DiscoverScreen({ profile, grants, setGrants, selectedIds, setSelectedIds, onFoundGrants, addToast, goProposals }) {
  const [phase, setPhase] = useState(grants.length ? "done" : "idle"); // idle | searching | ranking | done
  const [progressMsg, setProgressMsg] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const focuses = profile?.focuses || [];
  const focusPreview = isExpanded ? focuses : focuses.slice(0, 4);
  const extraCount = Math.max(0, focuses.length - 4);

  const runDiscovery = async () => {
    if (focuses.length === 0) {
      addToast("Add at least one focus area in your profile before searching.", "error");
      return;
    }
    
    setPhase("searching");
    setProgressMsg("Connecting to Gemini engine...");
    
    try {
      // Dispatch payload containing profile context straight to our internal route wrapper
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed API fetch communication.");
      }

      setPhase("ranking");
      setProgressMsg("Sifting and scoring matches...");
      
      // Artificial delay to make transition clean for users tracking the phase changes
      await new Promise((resolve) => setTimeout(resolve, 600));

      setGrants(data.grants || []);
      setPhase("done");
      onFoundGrants();
      addToast(`Found ${data.grants?.length || 0} matching grants using AI discovery.`, "success");

    } catch (err) {
      console.error(err);
      setPhase("idle");
      addToast("Couldn't complete the search. Verify backend credentials.", "error");
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
            <div className="chip-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {focuses.length === 0 ? (
                <span className="static-chip static-chip-muted" style={{ fontStyle: "italic" }}>
                  No focus areas added yet
                </span>
              ) : (
                focusPreview.map((f) => (
                  <span className="static-chip" key={f}>
                    {f}
                  </span>
                ))
              )}
              
              {!isExpanded && extraCount > 0 && (
                <button 
                  type="button" 
                  className="static-chip static-chip-muted text-button" 
                  onClick={() => setIsExpanded(true)}
                  style={{ cursor: "pointer", border: "none", background: "var(--bg-muted, #f3f4f6)" }}
                >
                  +{extraCount} more
                </button>
              )}

              {isExpanded && focuses.length > 4 && (
                <button 
                  type="button" 
                  className="static-chip static-chip-muted text-button" 
                  onClick={() => setIsExpanded(false)}
                  style={{ cursor: "pointer", border: "none", background: "var(--bg-muted, #f3f4f6)", fontWeight: "600" }}
                >
                  Show less
                </button>
              )}
            </div>
          </div>
          <ActionButton
            onPress={runDiscovery}
            busyText={phase === "searching" ? "Searching…" : "Ranking…"}
            variant="primary"
            size="lg"
          >
            {grants.length ? "Search again" : "Find grants"}
          </ActionButton>
        </div>
        {(phase === "searching" || phase === "ranking") && (
          <div className="progress-line" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
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
          <div className="results-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
            <div>
              <h3>Top {grants.length} matches</h3>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>Ranked by relevance to your organization's focus areas and values.</p>
            </div>
            <span className="select-summary" style={{ fontWeight: "600" }}>{selectedIds.length} of 5 selected</span>
          </div>
          <div className="grant-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {grants.map((g, i) => (
              <GrantCard key={g.id} grant={g} rank={i + 1} selected={selectedIds.includes(g.id)} onToggleSelect={toggleSelect} />
            ))}
          </div>
          <div className="discover-footer" style={{ marginTop: "2rem" }}>
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
            >
              Write proposals for {selectedIds.length || ""} selected grant{selectedIds.length === 1 ? "" : "s"}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}