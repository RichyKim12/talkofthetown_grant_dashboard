"use client";

import React, { useState } from "react";
import { ScreenHeader, EmptyState, Modal } from "../Layout";
import { ActionButton, Spinner } from "../ActionButton";
import { DownloadMenu } from "../DownloadMenu";
import { DraftEditor } from "../DraftEditor";
import { IconFile, IconSparkle, IconCheck } from "../icons";
import { timeAgo } from "../../utils/formatters";

export function ProposalsScreen({ profile, selectedGrants, drafts, setDrafts, addToast, goDiscover }) {
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [generatingIds, setGeneratingIds] = useState([]);

  const generateOne = async (grant) => {
    // Standardize naming fallbacks for messaging
    const grantName = grant.title || grant.name || "Selected Grant";
    
    setGeneratingIds((ids) => [...ids, grant.id]);
    try {
      // Connect directly to our secure Next.js backend endpoint wrapper
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, grant }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed network response during proposal generation.");
      }

      setDrafts((prev) => ({ 
        ...prev, 
        [grant.id]: { text: data.text, generatedAt: new Date(), grant } 
      }));
      addToast(`Draft ready for ${grantName}`, "success");
    } catch (err) {
      console.error(err);
      addToast(`Couldn't write a draft for ${grantName}. Try again.`, "error");
    } finally {
      setGeneratingIds((ids) => ids.filter((x) => x !== grant.id));
    }
  };

  const generateAll = async () => {
    const toGenerate = selectedGrants.filter((g) => !drafts[g.id]);
    if (toGenerate.length === 0) {
      addToast("All selected grants already have drafts.", "info");
      return;
    }
    // Fire generation requests concurrently via Promise.all
    await Promise.all(toGenerate.map((g) => generateOne(g)));
  };

  if (selectedGrants.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title="Proposal drafts" subtitle="Generated proposals for your selected grants will appear here." />
        <EmptyState
          icon={IconFile}
          title="No grants selected yet"
          body="Go to Discover & select grants to choose which ones to write proposals for, then come back here."
          action={
            <ActionButton onPress={async () => { await new Promise((r) => setTimeout(r, 150)); goDiscover(); }} variant="primary">
              Go to discover & select grants
            </ActionButton>
          }
        />
      </div>
    );
  }

  const activeDraft = activeDraftId ? drafts[activeDraftId] : null;

  return (
    <div className="screen">
      <ScreenHeader
        title="Proposal drafts"
        subtitle="Generate an AI-written first draft for each grant, then review and download before submitting."
        right={
          <ActionButton onPress={generateAll} variant="secondary" icon={<IconSparkle width={16} height={16} />}>
            Generate all drafts
          </ActionButton>
        }
      />

      <div className="proposal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {selectedGrants.map((grant) => {
          const draft = drafts[grant.id];
          const isGenerating = generatingIds.includes(grant.id);
          
          // Fallback UI layers to bind the Gemini discovery object structural fields securely
          const displayName = grant.title || grant.name;
          const displayFunder = grant.source || grant.funder;
          const minAmt = grant.amountMin?.toLocaleString() || "0";
          const maxAmt = grant.amountMax?.toLocaleString() || "0";

          return (
            <div className="proposal-card" key={grant.id} style={{ border: "1px solid var(--border, #e5e7eb)", padding: "1.25rem", borderRadius: "0.5rem", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px" }}>
              <div className="proposal-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>{displayName}</h3>
                  <p style={{ margin: 0, color: "var(--text-secondary, #4b5563)", fontSize: "0.9rem" }}>
                    {displayFunder} · ${minAmt}–${maxAmt}
                  </p>
                </div>
                {draft && (
                  <span className="status-pill status-ready" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#ecfdf5", color: "#065f46", padding: "0.25rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap" }}>
                    <IconCheck width={13} height={13} /> Draft ready
                  </span>
                )}
              </div>

              {isGenerating && (
                <div className="generating-block" role="status" aria-live="polite" style={{ display: "flex", gap: "0.75rem", background: "var(--bg-muted, #f9fafb)", padding: "1rem", borderRadius: "0.375rem" }}>
                  <Spinner size={20} />
                  <div>
                    <p className="generating-title" style={{ margin: "0 0 0.15rem 0", fontWeight: "600", fontSize: "0.9rem" }}>Writing your proposal…</p>
                    <p className="generating-sub" style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary, #6b7280)", lineHeight: "1.3" }}>
                      This usually takes a few moments. Feel free to wait.
                    </p>
                  </div>
                </div>
              )}

              {!draft && !isGenerating && (
                <ActionButton onPress={() => generateOne(grant)} variant="primary" busyText="Writing…" fullWidth>
                  Write proposal draft
                </ActionButton>
              )}  

              {draft && !isGenerating && (
                <div className="proposal-actions" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button className="btn btn-secondary" onClick={() => setActiveDraftId(grant.id)} style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border, #d1d5db)", borderRadius: "0.375rem", background: "#fff", cursor: "pointer" }}>
                    Review draft
                  </button>
                  <DownloadMenu grant={grant} draft={draft} addToast={addToast} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeDraft && (
        <Modal title={`Draft: ${activeDraft.grant.title || activeDraft.grant.name}`} onClose={() => setActiveDraftId(null)} wide>
          <p className="draft-meta" style={{ color: "var(--text-secondary, #6b7280)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Generated {timeAgo(activeDraft.generatedAt)} · You can edit this text before downloading.
          </p>
          <DraftEditor
            draft={activeDraft}
            grant={activeDraft.grant}
            onSave={(text) =>
              setDrafts((prev) => ({ ...prev, [activeDraft.grant.id]: { ...prev[activeDraft.grant.id], text } }))
            }
            addToast={addToast}
          />
        </Modal>
      )}
    </div>
  );
}