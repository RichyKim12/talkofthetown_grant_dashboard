import React, { useState } from "react";
import { ActionButton } from "./ActionButton";
import { DownloadMenu } from "./DownloadMenu";

/* ============================================================
   DRAFT EDITOR
   Shown inside the proposal review modal. Lets the user edit
   the AI-generated text directly before downloading — proposal
   drafts are a starting point, not a final answer, so editing
   has to be easy to find and use.
   ============================================================ */

export function DraftEditor({ draft, grant, onSave, addToast }) {
  const [text, setText] = useState(draft.text);
  const [saved, setSaved] = useState(true);

  return (
    <div className="draft-editor">
      <textarea
        className="draft-textarea"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={16}
      />
      <div className="draft-editor-actions">
        <span className="save-bar-hint">{saved ? "All changes saved" : "Unsaved changes"}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <ActionButton
            onPress={async () => {
              await new Promise((r) => setTimeout(r, 500));
              onSave(text);
              setSaved(true);
              addToast("Draft saved", "success");
            }}
            variant="secondary"
            busyText="Saving…"
          >
            Save changes
          </ActionButton>
          <DownloadMenu grant={grant} draft={{ ...draft, text }} addToast={addToast} />
        </div>
      </div>
    </div>
  );
}
