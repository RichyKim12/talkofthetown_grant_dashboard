import React, { useState } from "react";
import { ActionButton } from "./ActionButton";
import { IconDownload } from "./icons";

/* ============================================================
   DOWNLOAD MENU
   Fixed data contract variable crash and z-index dropdown layers.
   ============================================================ */

export function DownloadMenu({ grant, draft, addToast }) {
  const [open, setOpen] = useState(false);

  const download = async (format) => {
    setOpen(false);
    await new Promise((r) => setTimeout(r, 700));
    
    // SAFE PROPERTY MATCHING: Fallback pattern if grant.name doesn't exist
    const targetName = grant.title || grant.name || "grant-draft";
    
    const blob = new Blob([draft.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-proposal.${format === "pdf" ? "pdf" : "docx"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast(`Downloaded as ${format.toUpperCase()}`, "success");
  };

  return (
    // position: relative is vital so that our menu anchors precisely to the base button bounds
    <div className="download-menu-wrap" style={{ position: "relative", display: "inline-block" }}>
      <ActionButton onPress={() => setOpen((o) => !o)} variant="primary" icon={<IconDownload width={16} height={16} />}>
        Download
      </ActionButton>
      
      {open && (
        <div 
          className="download-menu" 
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: "0.25rem",
            zIndex: 9999,                    /* Overrides modal stacking layers */
            background: "#ffffff",            /* Prevents transparent overlapping text visibility bugs */
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            padding: "0.5rem 0",
            minWidth: "180px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button 
            onClick={() => download("pdf")} 
            role="menuitem"
            style={{
              padding: "0.5rem 1rem",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#111827",
              fontSize: "0.9rem"
            }}
          >
            Download as PDF
          </button>
          <button 
            onClick={() => download("docx")} 
            role="menuitem"
            style={{
              padding: "0.5rem 1rem",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#111827",
              fontSize: "0.9rem"
            }}
          >
            Download as Word (.docx)
          </button>
        </div>
      )}
    </div>
  );
}