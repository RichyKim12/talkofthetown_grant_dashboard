import React, { useState } from "react";
import { ScreenHeader, EmptyState, Modal } from "../components/Layout";
import { ActionButton, Spinner } from "../components/ActionButton";
import { DownloadMenu } from "../components/DownloadMenu";
import { DraftEditor } from "../components/DraftEditor";
import { IconFile, IconSparkle, IconCheck } from "../components/icons";
import { generateProposal } from "../utils/proposalService";
import { timeAgo } from "../utils/formatters";
import "../styles/Proposals.css";

/* ============================================================
   PROPOSAL DRAFTS SCREEN
   One card per selected grant. Generating, reviewing, and
   downloading all happen without leaving this screen — the
   review/edit step opens in a modal so context (which grant,
   which list) is never lost.
   ============================================================ */

export function ProposalsScreen({ profile, selectedGrants, drafts, setDrafts, addToast, goDiscover }) {
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [generatingIds, setGeneratingIds] = useState([]);

  const generateOne = async (grant) => {
    setGeneratingIds((ids) => [...ids, grant.id]);
    try {
      const text = await generateProposal(profile, grant);
      setDrafts((prev) => ({ ...prev, [grant.id]: { text, generatedAt: new Date(), grant } }));
      addToast(`Draft ready for ${grant.name}`, "success");
    } catch (err) {
      addToast(`Couldn't write a draft for ${grant.name}. Try again.`, "error");
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

      <div className="proposal-grid">
        {selectedGrants.map((grant) => {
          const draft = drafts[grant.id];
          const isGenerating = generatingIds.includes(grant.id);
          return (
            <div className="proposal-card" key={grant.id}>
              <div className="proposal-card-head">
                <div>
                  <h3>{grant.name}</h3>
                  <p>
                    {grant.funder} · ${grant.amountMin.toLocaleString()}–${grant.amountMax.toLocaleString()}
                  </p>
                </div>
                {draft && (
                  <span className="status-pill status-ready">
                    <IconCheck width={13} height={13} /> Draft ready
                  </span>
                )}
              </div>

              {isGenerating && (
                <div className="generating-block" role="status" aria-live="polite">
                  <Spinner size={20} />
                  <div>
                    <p className="generating-title">Writing your proposal…</p>
                    <p className="generating-sub">
                      This usually takes a few moments. Feel free to wait — the button is locked so it won't double-submit.
                    </p>
                  </div>
                </div>
              )}

              {!draft && !isGenerating && (
                <ActionButton onPress={() => generateOne(grant)} variant="primary" busyText="Writing…" icon={<IconSparkle width={16} height={16} />} fullWidth>
                  Write proposal draft
                </ActionButton>
              )}  

              {draft && !isGenerating && (
                <div className="proposal-actions">
                  <button className="btn btn-secondary" onClick={() => setActiveDraftId(grant.id)}>
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
        <Modal title={`Draft: ${activeDraft.grant.name}`} onClose={() => setActiveDraftId(null)} wide>
          <p className="draft-meta">
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
