"use client";

import React, { useState, useEffect } from "react";
import { ScreenHeader, EmptyState } from "../Layout";
import { ActionButton, Spinner } from "../ActionButton";
import { GrantCard, SkeletonGrantCard } from "../GrantCard";
import { IconSearch } from "../icons";

export function DiscoverScreen({ profile, grants, setGrants, selectedIds, setSelectedIds, onFoundGrants, addToast, goProposals }) {
  const [phase, setPhase] = useState(grants.length ? "done" : "idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);



  // Exclusions tracking states
  const [seenGrantIds, setSeenGrantIds] = useState([]);
  const [notInterestedIds, setNotInterestedIds] = useState([]);
  const [historicalIds, setHistoricalIds] = useState([]);

  const focuses = profile?.focuses || [];
  const focusPreview = isExpanded ? focuses : focuses.slice(0, 4);
  const extraCount = Math.max(0, focuses.length - 4);

  // Initialize the slider metric preference tracking value using the camelCase payload property
  const [minMatchScore, setMinMatchScore] = useState(profile?.minMatchScore ?? 70);

  // Sync threshold score fallback state when the active user profile hydrates asynchronously
  useEffect(() => {
    if (profile && typeof profile.minMatchScore === "number") {
      setMinMatchScore(profile.minMatchScore);
    }
  }, [profile]);

  // Load seen tracking cache from local storage and sync historical states from Supabase
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSeen = localStorage.getItem("discovered_seen_today");
      if (savedSeen) setSeenGrantIds(JSON.parse(savedSeen));
    }

    async function fetchHistoricalData() {
      try {
        const [proposalsRes, mutedRes] = await Promise.all([
          fetch("/api/proposals"),
          fetch("/api/grants/muted")
        ]);

        if (proposalsRes.ok) {
          const propData = await proposalsRes.json();
          if (propData.proposals) {
            setHistoricalIds(propData.proposals.map((p) => String(p.grant_id)));
          }
        }

        if (mutedRes.ok) {
          const mutedData = await mutedRes.json();
          if (mutedData.mutedIds) {
            setNotInterestedIds(mutedData.mutedIds.map(id => String(id)));
          }
        }
      } catch (err) {
        console.error("Failed to load historical exclusion context data:", err);
      }
    }
    fetchHistoricalData();
  }, []);

  useEffect(() => {
    setPhase(grants.length ? "done" : "idle");
  }, [grants]);

  // Handle immediate visual input changes, then persist state backend update metrics
  const handleSliderChange = async (e) => {
    const newScore = Number(e.target.value);
    setMinMatchScore(newScore);

    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_match_score: newScore }),
      });
      if (!response.ok) throw new Error("Server declined sync updates.");
    } catch (err) {
      console.error("Failed to persist threshold metrics upstream:", err);
    }
  };

  const runDiscovery = async () => {
    if (focuses.length === 0) {
      addToast("Add at least one focus area in your profile before searching.", "error");
      return;
    }

    setPhase("searching");
    setProgressMsg("Connecting to Gemini engine...");

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          historyIds: historicalIds,
          // temporarySeenIds: seenGrantIds,
          notInterestedIds: notInterestedIds
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed API fetch communication.");

      setPhase("ranking");
      setProgressMsg("Sifting and scoring matches...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      let freshGrants = data.grants || [];

      // 1. Sort match scores in descending order
      freshGrants.sort((a, b) => {
        const scoreA = a.score || a.matchScore || 0;
        const scoreB = b.score || b.matchScore || 0;
        return scoreB - scoreA;
      });

      // 2. Structural URL Check: Drop any entries without web guidelines
      freshGrants = freshGrants.filter(g => g.sourceUrl && g.sourceUrl.trim() !== "" && g.sourceUrl !== "#");

      // 3. THRESHOLD FILTER: Discard choices matching below state metric thresholds
      freshGrants = freshGrants.filter(g => {
        const currentScore = g.score || g.matchScore || 0;
        return currentScore >= minMatchScore;
      });

      // 4. Mute List Check: Filter out items database-muted by user
      freshGrants = freshGrants.filter(g => !notInterestedIds.includes(String(g.id)));

      // Temporarily save searched grants from today's active session
      const newSeenIds = [...new Set([...seenGrantIds, ...freshGrants.map(g => String(g.id))])];
      setSeenGrantIds(newSeenIds);
      localStorage.setItem("discovered_seen_today", JSON.stringify(newSeenIds));

      setGrants(freshGrants);
      setSelectedIds([]);

      setPhase("done");
      onFoundGrants();
      addToast(`Found ${freshGrants.length} matching grants meeting your threshold metrics.`, "success");
    } catch (err) {
      console.error(err);
      setPhase("idle");
      addToast("Couldn't complete the search. Verify backend credentials.", "error");
    }
  };

  const handleNotInterested = async (id) => {
    const stringId = String(id);
    setGrants((prev) => prev.filter((g) => String(g.id) !== stringId));
    setSelectedIds((prev) => prev.filter((x) => String(x) !== stringId));
    setNotInterestedIds((prev) => [...new Set([...prev, stringId])]);

    try {
      const response = await fetch("/api/grants/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId: stringId }),
      });

      if (!response.ok) throw new Error("Database failed to process request.");
      addToast("Grant preference saved. It won't show up in future searches.", "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to sync preference with database, but hid it for this session.", "error");
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

      <div className="panel discover-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="discover-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div className="discover-context">
            <p className="discover-context-label" style={{ margin: "0 0 0.5rem 0", fontWeight: "600", color: "var(--text-secondary)" }}>Searching using your saved focus areas</p>
            <div className="chip-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {focuses.length === 0 ? (
                <span className="static-chip static-chip-muted" style={{ fontStyle: "italic" }}>
                  No focus areas added yet
                </span>
              ) : (
                focusPreview.map((f) => <span className="static-chip" key={f}>{f}</span>)
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

        {/* Persistent Dynamic Match Score Slider Row UI */}
        {/* <div className="filter-row" style={{ borderTop: "1px solid var(--border, #e5e7eb)", paddingTop: "1rem", display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%", maxWidth: "340px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              Minimum Relevancy Filter Cutoff: <span style={{ color: "var(--primary-color, #2563eb)", fontWeight: "700" }}>{minMatchScore}%</span>
            </label>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={minMatchScore}
              onChange={handleSliderChange}
              style={{ width: "100%", cursor: "pointer", accentColor: "var(--primary-color, #2563eb)" }}
            />
          </div>
        </div> */}

        {(phase === "searching" || phase === "ranking") && (
          <div className="progress-line" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
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
          <SkeletonGrantCard /><SkeletonGrantCard /><SkeletonGrantCard />
        </div>
      )}

      {phase === "done" && grants.length === 0 && (
        <EmptyState
          icon={IconSearch}
          title="No opportunities met your criteria"
          body="Grants were found but fell below your minimum match score threshold. Try lowering the bar slider or expanding your profile focus criteria tags."
        />
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
              <GrantCard
                key={g.id}
                grant={g}
                rank={i + 1}
                selected={selectedIds.includes(g.id)}
                onToggleSelect={toggleSelect}
                onNotInterested={handleNotInterested}
              />
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