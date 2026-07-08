"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ActionButton, Spinner } from "../ActionButton";
import { IconCheck } from "../icons";
import "../../styles/ProposalsWorkspaceScreen.css";

export function ProposalsWorkspaceScreen({
  profile,
  selectedGrants = [],
  addToast,
  goDiscover,
  onRemoveSelected,
}) {
  const [activeTab, setActiveTab] = useState("selected");
  
  // FIX 1: Default to null strictly on load so no card is implicitly chosen 
  const [activeId, setActiveId] = useState(null);
  
  const [draftTexts, setDraftTexts] = useState({});
  const [historicalProposals, setHistoricalProposals] = useState([]);
  const [syncStatusById, setSyncStatusById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [composingId, setComposingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  // Conversational Refinement State Variables
  const [chatInput, setChatInput] = useState("");
  const [isIterating, setIsIterating] = useState(false);
  const [revertingId, setRevertingId] = useState(null);

  const handleRevertToActive = async (grantId, targetGrant) => {
    setRevertingId(grantId);
    const text = draftTexts[grantId] || "";
    const cleanGrant = targetGrant?.grant_id ? targetGrant : normalizeGrant(targetGrant);

    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: grantId,
          grantTitle: cleanGrant?.grant_title || "Untitled Grant",
          grantFunder: cleanGrant?.grant_funder || "Unknown Funder",
          proposalText: text,
          status: "draft", 
        }),
      });

      if (!res.ok) throw new Error();

      setHistoricalProposals((prev) =>
        prev.map((p) => (p.grant_id === grantId ? { ...p, status: "draft" } : p))
      );

      addToast("Proposal restored to Active Drafts.", "success");
      setActiveTab("active");
    } catch (err) {
      addToast("Failed to restore proposal.", "error");
    } finally {
      setRevertingId(null);
    }
  };
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
    const grantId = g.grant_id || g.id;
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

  const { selectedTabs, activeTabs, historyTabs } = useMemo(() => {
    const selectedList = [];
    const activeList = [];
    const historyList = [];

    selectedGrants.forEach((g) => {
      const normalized = normalizeGrant(g);
      if (!draftTexts[normalized.grant_id]) {
        selectedList.push(normalized);
      }
    });

    historicalProposals.forEach((hp) => {
      const normalized = normalizeGrant(hp);
      if (hp.status === "archived" || hp.status === "history") {
        historyList.push(normalized);
      } else if (draftTexts[normalized.grant_id]) {
        activeList.push(normalized);
      }
    });

    return {
      selectedTabs: selectedList,
      activeTabs: activeList,
      historyTabs: historyList,
    };
  }, [selectedGrants, draftTexts, historicalProposals]);

  // Set active tabs dynamically based on items present on initial mount hydration loops
  useEffect(() => {
    if (selectedGrants.length > 0) {
      setActiveTab("selected");
      setActiveId(selectedGrants[0].id);
    } else if (activeTabs.length > 0) {
      setActiveTab("active");
    } else if (historyTabs.length > 0) {
      setActiveTab("history");
    }
  }, [selectedGrants]);

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

      const currentRecord = historicalProposals.find(p => p.grant_id === grantId);
      const currentStatus = currentRecord?.status || "draft";

      try {
        const res = await fetch("/api/proposals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId: cleanGrant.grant_id,
            grantTitle: cleanGrant.grant_title,
            grantFunder: cleanGrant.grant_funder,
            proposalText: text,
            status: currentStatus,
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
        body: JSON.stringify({ profile, grant: targetGrant }),
      });

      const data = await res.json();

      if (res.ok && data.data?.proposal_text) {
        setDraftTexts((prev) => ({ ...prev, [grantId]: data.data.proposal_text }));

        const updatedHistoryRes = await fetch("/api/proposals");
        const historyData = await updatedHistoryRes.json();
        if (historyData.proposals) setHistoricalProposals(historyData.proposals);

        setSyncStatusById((prev) => ({ ...prev, [grantId]: "All changes saved to cloud" }));
        addToast("Draft generated! Moved to Active Workspace.", "success");
        setActiveTab("active");
        setActiveId(grantId);
      } else {
        addToast(data.error || "Gemini generation failed.", "error");
      }
    } catch (e) {
      addToast("Failed to generate draft.", "error");
    } finally {
      setComposingId(null);
    }
  };

  const handleIterateDraft = async (targetGrant) => {
    if (!chatInput.trim() || !activeId) return;
    setIsIterating(true);
    setSyncStatusById((prev) => ({ ...prev, [activeId]: "Refining with Gemini..." }));

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          grant: targetGrant,
          action: "iterate",
          currentDraft: draftTexts[activeId],
          instruction: chatInput,
        }),
      });

      const data = await res.json();

      if (res.ok && data.data?.proposal_text) {
        setDraftTexts((prev) => ({ ...prev, [activeId]: data.data.proposal_text }));
        setSyncStatusById((prev) => ({ ...prev, [activeId]: "All changes saved to cloud" }));
        addToast("Draft successfully refined by Gemini!", "success");
        setChatInput("");
      } else {
        addToast(data.error || "Refinement iteration failed.", "error");
        setSyncStatusById((prev) => ({ ...prev, [activeId]: "All changes saved to cloud" }));
      }
    } catch (err) {
      addToast("Network or logic execution error during iteration.", "error");
    } finally {
      setIsIterating(false);
    }
  };

  const handleArchiveToHistory = async (grantId, targetGrant) => {
    setArchivingId(grantId);
    const text = draftTexts[grantId] || "";
    const cleanGrant = targetGrant?.grant_id ? targetGrant : normalizeGrant(targetGrant);

    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: grantId,
          grantTitle: cleanGrant?.grant_title || "Untitled Grant",
          grantFunder: cleanGrant?.grant_funder || "Unknown Funder",
          proposalText: text,
          status: "archived",
        }),
      });

      if (!res.ok) throw new Error();

      setHistoricalProposals((prev) =>
        prev.map((p) => (p.grant_id === grantId ? { ...p, status: "archived" } : p))
      );

      addToast("Proposal moved to History tab.", "success");
      setActiveId(null); // Deselect explicitly after moving to avoid confusion
      setActiveTab("history");
    } catch (err) {
      addToast("Failed to move proposal to history.", "error");
    } finally {
      setArchivingId(null);
    }
  };

  const handleRemoveSelected = (grantId) => {
    if (activeId === grantId) {
      setActiveId(null);
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

      setHistoricalProposals((prev) => prev.filter((p) => p.grant_id !== grantId));
      setDraftTexts((prev) => {
        const next = { ...prev };
        delete next[grantId];
        return next;
      });

      onRemoveSelected?.(grantId);

      if (activeId === grantId) {
        setActiveId(null);
      }

      addToast("Deleted permanently from history.", "success");
    } catch (err) {
      addToast("Failed to delete.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadAsPDF = (grant) => {
    const text = draftTexts[grant.grant_id] || "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${grant.grant_title} - Proposal</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; line-height: 1.6; color: #111827; }
            h1 { margin-bottom: 5px; font-size: 24px; }
            h2 { font-size: 14px; color: #6b7280; font-weight: normal; margin-top: 0; margin-bottom: 30px; }
            p { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${grant.grant_title}</h1>
          <h2>Funder: ${grant.grant_funder} ${grant.amount ? `| ${grant.amount}` : ""}</h2>
          <hr />
          <p>${text}</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadAsDoc = (grant) => {
    const text = draftTexts[grant.grant_id] || "";
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${grant.grant_title}</title><style>body { font-family: Arial; line-height: 1.5; }</style></head>
      <body>
        <h2>${grant.grant_title}</h2>
        <p><b>Funder:</b> ${grant.grant_funder}</p>
        <hr/>
        <p style="white-space: pre-wrap;">${text}</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grant.grant_title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_proposal.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allKnownTabs = [...selectedTabs, ...activeTabs, ...historyTabs];
  
  // FIX 2: Strict lookup mapping. If no activeId is tracked, activeGrant is deterministic null.
  const activeGrant = activeId ? allKnownTabs.find((g) => g.grant_id === activeId) || null : null;
  
  const activeRawGrant = activeGrant ? rawGrantsById[activeGrant.grant_id] : null;
  const hasDraftContent = activeId && draftTexts[activeId] !== undefined;
  const activeSyncStatus = (activeId && syncStatusById[activeId]) || "All changes saved to cloud";
  const isComposingActive = composingId === activeId;
  const isDownloadable = hasDraftContent && (activeTab === "active" || activeTab === "history");

  if (isLoading) {
    return (
      <div className="workspace-loading-container">
        <div className="workspace-loading-wrapper">
          <Spinner size={24} />
          <p className="workspace-loading-text">Loading Workspace Records...</p>
        </div>
      </div>
    );
  }

  const renderTabItems = (tabs, type) => {
    if (tabs.length === 0) {
      return (
        <div className="workspace-empty-state">
          No {type} items available.
        </div>
      );
    }

    return (
      <div className="workspace-card-list">
        {tabs.map((g) => {
          const isActive = g.grant_id === activeId;
          const isDeleting = deletingId === g.grant_id;

          let cardClasses = "workspace-card-btn";
          if (isActive) cardClasses += " active";
          if (type === "history") cardClasses += " history-bg";

          let closeBtnClasses = "workspace-card-close-btn";
          if (type === "history") closeBtnClasses += " history-delete";

          return (
            <div key={`${type}-${g.grant_id}`} className="workspace-card-wrapper" style={{ opacity: isDeleting ? 0.5 : 1 }}>
              <button onClick={() => setActiveId(g.grant_id)} className={cardClasses}>
                <span className="workspace-card-title">{g.grant_title}</span>
                <div className="workspace-card-meta">
                  <span className="workspace-card-funder">{g.grant_funder}</span>
                  <span className="workspace-card-status-label">
                    {type === "selected" ? "Empty Shell" : type === "history" ? "Archived" : "Active Draft"}
                  </span>
                </div>
              </button>

              <button
                onClick={() => type === "history" ? handleDeleteFromHistory(g.grant_id) : handleRemoveSelected(g.grant_id)}
                disabled={isDeleting}
                title={type === "history" ? "Delete permanently" : "Remove from workspace"}
                className={closeBtnClasses}
                style={{ cursor: isDeleting ? "default" : "pointer" }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="workspace-main-container">
      {/* Header Panel */}
      <div className="workspace-header-panel">
        <h1 className="workspace-header-title">Proposals Workbench</h1>
        <p className="workspace-header-subtitle">
          Review, edit, and export your active proposal applications side-by-side.
        </p>
      </div>

      {/* Workspace Split Layout */}
      <div className="workspace-body-split">
        {/* LEFT COLUMN — Tabbed List */}
        <div className="workspace-sidebar-column">
          <div className="workspace-tab-headers">
            <button
              onClick={() => setActiveTab("selected")}
              className={`workspace-tab-btn ${activeTab === "selected" ? "active" : ""}`}
            >
              Selected ({selectedTabs.length})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`workspace-tab-btn ${activeTab === "active" ? "active" : ""}`}
            >
              Active ({activeTabs.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`workspace-tab-btn ${activeTab === "history" ? "active" : ""}`}
            >
              History ({historyTabs.length})
            </button>
          </div>

          <div className="workspace-sidebar-scroll">
            {activeTab === "selected" && renderTabItems(selectedTabs, "selected")}
            {activeTab === "active" && renderTabItems(activeTabs, "active")}
            {activeTab === "history" && renderTabItems(historyTabs, "history")}
          </div>
        </div>

        {/* RIGHT COLUMN — Content Canvas */}
        <div className="workspace-content-column">
          {activeGrant ? (
            <div className="workspace-canvas-layout">
              <div className="workspace-canvas-meta-bar">
                <div>
                  <h3 className="workspace-canvas-title">{activeGrant.grant_title}</h3>
                  <span className="workspace-canvas-submeta">
                    Funder: {activeGrant.grant_funder}
                    {activeGrant.amount ? ` · ${activeGrant.amount}` : ""}
                  </span>
                </div>

                <div className="workspace-canvas-right-actions">
                  {activeTab === "active" && hasDraftContent && (
                    <button
                      onClick={() => handleArchiveToHistory(activeId, activeRawGrant || activeGrant)}
                      className="workspace-download-btn"
                      style={{ marginRight: "8px", backgroundColor: "var(--accent-subtle)", borderColor: "var(--accent)" }}
                      disabled={archivingId === activeId}
                    >
                      {archivingId === activeId ? "Archiving..." : "Move to History"}
                    </button>
                  )}
                  {activeTab === "history" && (
                    <button
                      onClick={() => handleRevertToActive(activeId, activeRawGrant || activeGrant)}
                      className="workspace-download-btn"
                      style={{ marginRight: "8px", backgroundColor: "#e0f2fe", borderColor: "#0284c7", color: "#0369a1" }}
                      disabled={revertingId === activeId}
                    >
                      {revertingId === activeId ? "Restoring..." : "Restore to Active"}
                    </button>
                  )}

                  {isDownloadable && (
                    <div className="workspace-download-group">
                      <button onClick={() => downloadAsPDF(activeGrant)} className="workspace-download-btn">PDF</button>
                      <button onClick={() => downloadAsDoc(activeGrant)} className="workspace-download-btn">DOC</button>
                    </div>
                  )}

                  <div className="workspace-sync-display">
                    {activeSyncStatus === "All changes saved to cloud" ? (
                      <>All changes saved<br />to cloud</>
                    ) : (
                      activeSyncStatus
                    )}
                  </div>
                </div>
              </div>

              <div className="workspace-canvas-body">
                {hasDraftContent ? (
                  <div className="workspace-editor-chat-wrapper">
                    <div className="workspace-textarea-container">
                      <textarea
                        value={draftTexts[activeId] || ""}
                        onChange={(e) => handleTextUpdate(e.target.value, activeRawGrant || activeGrant)}
                        className="workspace-textarea"
                        placeholder="Start typing your response proposal copy..."
                        disabled={isIterating || activeTab === "history"}
                      />

                      {isIterating && (
                        <div className="workspace-editor-overlay">
                          <div className="workspace-overlay-card">
                            <Spinner size={28} />
                            <p className="workspace-overlay-text">Gemini is revising your draft...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {activeTab !== "history" && (
                      <div className="workspace-chat-bar">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask Gemini to refine this draft (e.g., 'Make the executive summary more formal')..."
                          className="workspace-chat-input"
                          disabled={isIterating}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleIterateDraft(activeRawGrant || activeGrant);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleIterateDraft(activeRawGrant || activeGrant)}
                          disabled={isIterating || !chatInput.trim()}
                          className="workspace-chat-send-btn"
                        >
                          {isIterating ? "Refining..." : "Refine Draft"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="workspace-centered-prompt">
                    {!activeRawGrant ? (
                      <>
                        <h4 className="workspace-prompt-headline">Original grant data unavailable</h4>
                        <p className="workspace-prompt-p">
                          This grant came from a previous session and its full details weren't carried over.
                        </p>
                        <ActionButton onPress={goDiscover} variant="secondary">
                          Back to Discover
                        </ActionButton>
                      </>
                    ) : (
                      <>
                        <h4 className="workspace-prompt-headline">Draft Proposal Content Missing</h4>
                        <p className="workspace-prompt-p">
                          You haven't requested an AI composition for this specific grant opportunity yet.
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
            <div className="workspace-unselected-placeholder" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: "300px", color: "var(--text-muted, #6b7280)", fontSize: "1.1rem", fontWeight: "500", fontStyle: "italic" }}>
              Select an application from the sidebar tabs to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}