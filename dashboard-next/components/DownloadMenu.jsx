import React, { useState } from "react";
import { ActionButton } from "./ActionButton";
import { IconDownload } from "./icons";

/* ============================================================
   DOWNLOAD MENU
   Used wherever a finished draft needs to leave the app as a
   file. The actual PDF/Word generation will be a backend call
   later — this mocks the download with a text blob so the
   interaction (choose format -> wait -> file appears) is real.
   ============================================================ */

export function DownloadMenu({ grant, draft, addToast }) {
  const [open, setOpen] = useState(false);

  const download = async (format) => {
    setOpen(false);
    await new Promise((r) => setTimeout(r, 700));
    const blob = new Blob([draft.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grant.name.replace(/[^a-z0-9]+/gi, "-")}-proposal.${format === "pdf" ? "pdf" : "docx"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast(`Downloaded as ${format.toUpperCase()}`, "success");
  };

  return (
    <div className="download-menu-wrap">
      <ActionButton onPress={() => setOpen((o) => !o)} variant="primary" icon={<IconDownload width={16} height={16} />}>
        Download
      </ActionButton>
      {open && (
        <div className="download-menu" role="menu">
          <button onClick={() => download("pdf")} role="menuitem">
            Download as PDF
          </button>
          <button onClick={() => download("docx")} role="menuitem">
            Download as Word (.docx)
          </button>
        </div>
      )}
    </div>
  );
}
