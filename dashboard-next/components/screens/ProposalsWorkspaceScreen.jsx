"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ActionButton, Spinner } from "../ActionButton";
import { IconCheck } from "../icons";
import "../../styles/ProposalsWorkspaceScreen.css"; // Assumes styles.css is in the same directory

export function ProposalsWorkspaceScreen({
  profile,
  selectedGrants = [],
  addToast,
  goDiscover,
  onRemoveSelected,
}) {
  const [activeTab, setActiveTab] = useState("selected"); // "selected" | "active" | "history"
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

  const { selectedTabs, activeTabs, historyTabs } = useMemo(() => {
    const selectedList = [];
    const activeList = [];
    
    selectedGrants.forEach((g) => {
      const normalized = normalizeGrant(g);
      if (draftTexts[normalized.grant_id]) {
        activeList.push(normalized);
      } else {
        selectedList.push(normalized);
      }
    });

    const historyList = historicalProposals
      .filter((hp) => !rawGrantsById[hp.grant_id])
      .map((p) => normalizeGrant(p));

    return {
      selectedTabs: selectedList,
      activeTabs: activeList,
      historyTabs: historyList,
    };
  }, [selectedGrants, draftTexts, historicalProposals, rawGrantsById]);

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

      setHistoricalProposals((prev) => prev.filter((p) => p.grant_id !== grantId));
      setDraftTexts((prev) => {
        const next = { ...prev };
        delete next[grantId];
        return next;
      });

      onRemoveSelected?.(grantId);

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
  const activeGrant = allKnownTabs.find((g) => g.grant_id === activeId) || allKnownTabs[0] || null;
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
          
          // Combine clean structural classes for dynamic conditional styling
          let cardClasses = "workspace-card-btn";
          if (isActive) cardClasses += " active";
          if (type === "history") cardClasses += " history-bg";

          let closeBtnClasses = "workspace-card-close-btn";
          if (type === "history") closeBtnClasses += " history-delete";

          return (
            <div key={`${type}-${g.grant_id}`} className="workspace-card-wrapper" style={{ opacity: isDeleting ? 0.5 : 1 }}>
              <button onClick={() => setActiveId(g.grant_id)} className={cardClasses}>
                <span className="workspace-card-title">{g.grant_title} 
                  grant id {g.grant_id}
                  org id {g.org_id}
                </span>
                <div className="workspace-card-meta">
                  <span className="workspace-card-funder">{g.grant_funder}</span>
                  <span className="workspace-card-status-label">
                    {type === "selected" ? "Empty Shell" : "Active Draft"}
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
                  <textarea
                    value={draftTexts[activeId] || ""}
                    onChange={(e) => handleTextUpdate(e.target.value, activeRawGrant || activeGrant)}
                    className="workspace-textarea"
                    placeholder="Start typing your response proposal copy..."
                  />
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
            <div className="workspace-unselected-placeholder">
              Select an application from the sidebar tabs to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}