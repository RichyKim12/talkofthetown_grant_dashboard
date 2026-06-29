import React, { useState } from "react";
import { PALETTES } from "../data/palettes";
import { IconPalette, IconChevronDown, IconCheck } from "./icons";

/* ============================================================
   PALETTE SWITCHER
   Lets the user compare color themes live. Lives in the
   sidebar footer since it's a settings-style control, not a
   step in the pipeline.
   ============================================================ */

export function PaletteSwitcher({ paletteKey, setPaletteKey }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="palette-switcher">
      <button className="palette-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <IconPalette width={18} height={18} />
        <span>Color theme: {PALETTES[paletteKey].label}</span>
        <IconChevronDown width={16} height={16} />
      </button>
      {open && (
        <div className="palette-menu" role="menu">
          {Object.entries(PALETTES).map(([key, p]) => (
            <button
              key={key}
              className={`palette-option${key === paletteKey ? " palette-option-active" : ""}`}
              onClick={() => {
                setPaletteKey(key);
                setOpen(false);
              }}
              role="menuitemradio"
              aria-checked={key === paletteKey}
            >
              <span className="palette-swatch">
                <span style={{ background: p["--accent"] }} />
                <span style={{ background: p["--bg-sidebar"] }} />
                <span style={{ background: p["--bg-page"] }} />
              </span>
              <span className="palette-option-text">
                <strong>{p.label}</strong>
                <small>{p.blurb}</small>
              </span>
              {key === paletteKey && <IconCheck width={16} height={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
