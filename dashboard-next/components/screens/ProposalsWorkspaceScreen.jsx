"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ActionButton, Spinner } from "../ActionButton";
import { IconCheck } from "../icons";

export function ProposalsWorkspaceScreen({
  profile,
  selectedGrants = [],
  addToast,
  goDiscover,
  onRemoveSelected, // (grantId) => void — removes a grant from the current selection, doesn't touch the DB
}) {
  const [activeId, setActiveId] = useState(selectedGrants[0]?.id || null);
  const [draftTexts, setDraftTexts] = useState({});
  const [historicalProposals, setHistoricalProposals] = useState([]);
  const [syncStatusById, setSyncStatusById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [composingId, setComposingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const debounceTimersRef = useRef({});

  const rawGrantsById = useMemo(() => {
    const map = {};
    selectedGrants.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [selectedGrants]);

  const normalizeGrant = (g) => {
    if (!g) return null;
    const grantId = g.id || g.grant_id;
    const amount =
      g.amountMin != null && g.amountMax != null
        ? `$${g.amountMin.toLocaleString()}–$${g.amountMax.toLocaleString()}`
        : g.amount || null;

    return {
      grant_id: grantId,
      grant_title: g.title || g.name || g.grant_title || "Untitled Grant",
      grant_funder:
        g.source || g.funder || g.via || g.grant_funder || g.organization || "Unknown Funder",
      amount,
    };
  };

  useEffect(() => {
    async function loadWorkspaceAndHistory() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/proposals");
        const data = await res.json();

        if (res.ok && data.proposals) {
          setHistoricalProposals(data.proposals);

          const cloudDrafts = data.proposals.reduce((acc, row) => {
            acc[row.grant_id] = row.proposal_text;
            return acc;
          }, {});

          setDraftTexts(cloudDrafts);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkspaceAndHistory();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const syncToCloud = (grantId, text, targetGrant) => {
    if (debounceTimersRef.current[grantId]) {
      clearTimeout(debounceTimersRef.current[grantId]);
    }

    debounceTimersRef.current[grantId] = setTimeout(async () => {
      const cleanGrant = targetGrant?.grant_id
        ? targetGrant
        : normalizeGrant(targetGrant) || { grant_id: grantId, grant_title: "Untitled Grant", grant_funder: "Unknown Funder" };

      try {
        const res = await fetch("/api/proposals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId: cleanGrant.grant_id,
            grantTitle: cleanGrant.grant_title,
            grantFunder: cleanGrant.grant_funder,
            proposalText: text,
            status: "draft",
          }),
        });
        if (!res.ok) throw new Error();
        setSyncStatusById((prev) => ({ ...prev, [grantId]: "All changes saved to cloud" }));
      } catch (err) {
        setSyncStatusById((prev) => ({ ...prev, [grantId]: "Saved locally (Sync pending)" }));
      }
    }, 1500);
  };

  const handleTextUpdate = (text, targetGrant) => {
    if (!activeId) return;
    setDraftTexts((prev) => ({ ...prev, [activeId]: text }));
    setSyncStatusById((prev) => ({ ...prev, [activeId]: "Saving changes..." }));
    syncToCloud(activeId, text, targetGrant);
  };

  const handleComposeFirstDraft = async (targetGrant) => {
    const grantId = targetGrant.id || targetGrant.grant_id;
    setComposingId(grantId);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          grant: targetGrant,
        }),
      });

      const data = await res.json();

      if (res.ok && data.data?.proposal_text) {
        setDraftTexts((prev) => ({ ...prev, [grantId]: data.data.proposal_text }));

        const updatedHistoryRes = await fetch("/api/proposals");
        const historyData = await updatedHistoryRes.json();
        if (historyData.proposals) setHistoricalProposals(historyData.proposals);

        setSyncStatusById((prev) => ({ ...prev, [grantId]: "All changes saved to cloud" }));
        addToast("Draft generated!", "success");
      } else {
        addToast(data.error || "Gemini generation failed.", "error");
      }
    } catch (e) {
      addToast("Failed to generate draft.", "error");
    } finally {
      setComposingId(null);
    }
  };

  const handleRemoveSelected = (grantId) => {
    if (activeId === grantId) {
      const remaining = selectedGrants.filter((g) => g.id !== grantId);
      setActiveId(remaining[0]?.id || historicalProposals[0]?.grant_id || null);
    }
    onRemoveSelected?.(grantId);
  };

  const handleDeleteFromHistory = async (grantId) => {
    setDeletingId(grantId);
    try {
      const res = await fetch(`/api/proposals?grantId=${encodeURIComponent(grantId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      // 1. Remove from local history state array
      setHistoricalProposals((prev) => prev.filter((p) => p.grant_id !== grantId));

      // 2. Clear out the cached draft text
      setDraftTexts((prev) => {
        const next = { ...prev };
        delete next[grantId];
        return next;
      });

      // 3. CRITICAL: Break the reference in the parent's selected list so it vanishes from all view arrays
      onRemoveSelected?.(grantId);

      // 4. Reset active focus fallback safely
      if (activeId === grantId) {
        const remainingSelected = selectedGrants.filter((g) => g.id !== grantId);
        setActiveId(remainingSelected[0]?.id || null);
      }

      addToast("Deleted permanently from history.", "success");
    } catch (err) {
      addToast("Failed to delete.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const [activeTab, setActiveTab] = useState("selected"); // "selected" | "history"

  const selectedTabs = selectedGrants.map((g) => normalizeGrant(g));
  const historyTabs = historicalProposals.map((p) => normalizeGrant(p));

  const allKnownTabs = [...selectedTabs, ...historyTabs];
  const activeGrant =
    allKnownTabs.find((g) => g.grant_id === activeId) || allKnownTabs[0] || null;
  const activeRawGrant = activeGrant ? rawGrantsById[activeGrant.grant_id] : null;
  const hasDraftContent = activeId && draftTexts[activeId] !== undefined;
  const activeSyncStatus = (activeId && syncStatusById[activeId]) || "All changes saved to cloud";
  const isComposingActive = composingId === activeId;

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <Spinner size={24} />
          <p style={{ marginTop: "1rem", color: "#6b7280" }}>Loading Workspace Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        maxWidth: "none",
        flex: "1 1 auto",
        alignSelf: "stretch",
        fontFamily: "inherit",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: "2rem 2rem 1rem 2rem", flexShrink: 0 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "800", margin: "0 0 0.5rem 0", color: "#000" }}>Proposals Workbench</h1>
        <p style={{ margin: 0, color: "#374151", fontSize: "0.95rem" }}>
          Review, edit, and export your active proposal applications side-by-side.
        </p>
      </div>

      <div style={{ display: "flex", gap: "2rem", flex: 1, minHeight: 0, padding: "0 2rem 2rem 2rem", width: "100%", boxSizing: "border-box" }}>
        {/* LEFT COLUMN — scrolls independently */}
        <div
          style={{
            width: "320px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, marginBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setActiveTab("selected")}
              style={{
                padding: "0.6rem 0.25rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === "selected" ? "2px solid #9a3412" : "2px solid transparent",
                color: activeTab === "selected" ? "#000" : "#6b7280",
                fontWeight: activeTab === "selected" ? "700" : "500",
                fontSize: "0.9rem",
                cursor: "pointer",
                marginRight: "1.25rem",
              }}
            >
              Selected ({selectedTabs.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: "0.6rem 0.25rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === "history" ? "2px solid #9a3412" : "2px solid transparent",
                color: activeTab === "history" ? "#000" : "#6b7280",
                fontWeight: activeTab === "history" ? "700" : "500",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              History ({historyTabs.length})
            </button>
          </div>

          <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.25rem" }}>
            {activeTab === "selected" && (
              <div>
                {selectedTabs.length === 0 ? (
                  <div style={{ padding: "1rem", color: "#9ca3af", fontSize: "0.9rem", fontStyle: "italic" }}>
                    No items selected.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {selectedTabs.map((g) => {
                      const isActive = g.grant_id === activeId;
                      const isSavedInDB = !!draftTexts[g.grant_id];

                      return (
                        <div key={`sel-${g.grant_id}`} style={{ position: "relative" }}>
                          <button
                            onClick={() => setActiveId(g.grant_id)}
                            style={{
                              width: "100%",
                              padding: "1.25rem 2.25rem 1.25rem 1rem",
                              borderRadius: "8px",
                              textAlign: "left",
                              border: isActive ? "2px solid #9a3412" : "1px solid #e5e7eb",
                              backgroundColor: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                              boxShadow: isActive ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                          >
                            <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#000", lineHeight: "1.3" }}>
                              {g.grant_title}
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", color: "#6b7280" }}>
                              <span style={{ color: "#4b5563" }}>{g.grant_funder}</span>
                              <span style={{ color: "#a1a1aa" }}>{isSavedInDB ? "Saved Draft" : "Empty Shell"}</span>
                            </div>
                          </button>
                          <button
                            onClick={() => handleRemoveSelected(g.grant_id)}
                            title="Remove from selection"
                            style={{
                              position: "absolute",
                              top: "0.6rem",
                              right: "0.6rem",
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              border: "none",
                              background: "#f3f4f6",
                              color: "#6b7280",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              lineHeight: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div>
                {historyTabs.length === 0 ? (
                  <div style={{ padding: "1rem", color: "#9ca3af", fontSize: "0.9rem", fontStyle: "italic" }}>
                    No saved proposals yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {historyTabs.map((g) => {
                      const isActive = g.grant_id === activeId;
                      const isDeleting = deletingId === g.grant_id;

                      return (
                        <div key={`hist-${g.grant_id}`} style={{ position: "relative", opacity: isDeleting ? 0.5 : 1 }}>
                          <button
                            onClick={() => setActiveId(g.grant_id)}
                            style={{
                              width: "100%",
                              padding: "1.25rem 2.25rem 1.25rem 1rem",
                              borderRadius: "8px",
                              textAlign: "left",
                              border: isActive ? "2px solid #9a3412" : "1px solid #e5e7eb",
                              backgroundColor: "#fafafa",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#000", lineHeight: "1.3" }}>
                              {g.grant_title}
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", color: "#6b7280" }}>
                              <span style={{ color: "#4b5563" }}>{g.grant_funder}</span>
                              <span style={{ color: "#a1a1aa" }}>Saved Draft</span>
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteFromHistory(g.grant_id)}
                            disabled={isDeleting}
                            title="Delete permanently"
                            style={{
                              position: "absolute",
                              top: "0.6rem",
                              right: "0.6rem",
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              border: "none",
                              background: "#fee2e2",
                              color: "#b91c1c",
                              cursor: isDeleting ? "default" : "pointer",
                              fontSize: "0.85rem",
                              lineHeight: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — fills remaining width, internal scroll only in the textarea */}
        <div
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            background: "#fff",
            border: "1px solid #f3f4f6",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            minHeight: 0,
          }}
        >
          {activeGrant ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
                <div>
                  <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1.1rem", fontWeight: "700", color: "#000", maxWidth: "500px", lineHeight: "1.3" }}>
                    {activeGrant.grant_title}
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                    Funder: {activeGrant.grant_funder}
                    {activeGrant.amount ? ` · ${activeGrant.amount}` : ""}
                  </span>
                </div>
                <div style={{ fontStyle: "italic", fontSize: "0.85rem", color: "#059669", fontWeight: "500", textAlign: "right", flexShrink: 0 }}>
                  {activeSyncStatus === "All changes saved to cloud" ? (
                    <>All changes saved<br />to cloud</>
                  ) : (
                    activeSyncStatus
                  )}
                </div>
              </div>

              <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {hasDraftContent ? (
                  <textarea
                    value={draftTexts[activeId] || ""}
                    onChange={(e) => handleTextUpdate(e.target.value, activeRawGrant || activeGrant)}
                    style={{
                      flex: 1,
                      width: "100%",
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      resize: "none",
                      outline: "none",
                      fontSize: "0.95rem",
                      lineHeight: "1.6",
                      color: "#111827",
                      backgroundColor: "#ffffff",
                      overflowY: "auto",
                    }}
                    placeholder="Start typing your response proposal copy..."
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", margin: "auto" }}>
                    {!activeRawGrant ? (
                      <>
                        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1.05rem", fontWeight: "700", color: "#000" }}>
                          Original grant data unavailable
                        </h4>
                        <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "380px", margin: "0 0 2rem 0", lineHeight: "1.5" }}>
                          This grant came from a previous session and its full details weren't carried over, so a draft can't be generated. Return to Discover and re-select it, or start a new search.
                        </p>
                        <ActionButton onPress={goDiscover} variant="secondary">
                          Back to Discover
                        </ActionButton>
                      </>
                    ) : (
                      <>
                        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1.05rem", fontWeight: "700", color: "#000" }}>
                          Draft Proposal Content Missing
                        </h4>
                        <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "380px", margin: "0 0 2rem 0", lineHeight: "1.5" }}>
                          You haven't requested a Gemini composition matrix copy for this specific grant opportunity pipeline yet.
                        </p>
                        <ActionButton
                          onPress={() => handleComposeFirstDraft(activeRawGrant)}
                          variant="primary"
                          disabled={isComposingActive}
                        >
                          {isComposingActive ? "Initializing..." : "Compose First AI Draft"}
                        </ActionButton>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: "#9ca3af", textAlign: "center", margin: "auto", padding: "3rem" }}>
              Select an active application from the sidebar to begin, or discover new grants.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}