import React, { useState } from "react";
import { PALETTES } from "./data/palettes";
import { SEED_PROFILE } from "./data/mockData";
import { Toast, useToasts } from "./components/Toast";
import { ProgressSteps } from "./components/ProgressSteps";
import { PaletteSwitcher } from "./components/PaletteSwitcher";
import { IconClipboard } from "./components/icons";
import { ProfileScreen } from "./screens/ProfileScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { ProposalsScreen } from "./screens/ProposalsScreen";
import "./styles/App.css";

/* ============================================================
   ROOT APP
   Owns the cross-screen state (profile, grants, selection,
   drafts, which screen is active) and renders the sidebar +
   whichever screen is current. Each screen is otherwise
   self-contained and only talks to the outside through props.

   Three-step pipeline:
     1. Organization profile
     2. Discover & select grants  (merged search + shortlist)
     3. Proposal drafts
   ============================================================ */

export default function App() {
  const [paletteKey, setPaletteKey] = useState("harvest");
  const [screen, setScreen] = useState("profile");
  const [profile, setProfile] = useState(SEED_PROFILE);
  const [grants, setGrants] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [completed, setCompleted] = useState(new Set());
  const [navOpen, setNavOpen] = useState(false);

  const { toasts, addToast, dismissToast } = useToasts();

  const palette = PALETTES[paletteKey];
  const cssVars = Object.fromEntries(Object.entries(palette).filter(([k]) => k.startsWith("--")));

  const markDone = (key) => setCompleted((prev) => new Set(prev).add(key));

  const selectedGrants = grants.filter((g) => selectedIds.includes(g.id));

  const goTo = (key) => {
    setScreen(key);
    setNavOpen(false);
  };

  return (
    <div className="app-root" style={cssVars}>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <button className="mobile-nav-toggle" onClick={() => setNavOpen((o) => !o)} aria-label="Toggle navigation">
        <IconClipboard width={20} height={20} />
      </button>

      <aside className={`sidebar${navOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">LV</div>
          <div>
            <p className="brand-name">{profile.orgName.split(" ").slice(0, 2).join(" ")}</p>
            <p className="brand-sub">Grant assistant</p>
          </div>
        </div>
        <ProgressSteps current={screen} onJump={goTo} completed={completed} />
        <div className="sidebar-footer">
          <PaletteSwitcher paletteKey={paletteKey} setPaletteKey={setPaletteKey} />
        </div>
      </aside>

      <main className="main-area">
        {screen === "profile" && (
          <ProfileScreen
            profile={profile}
            setProfile={setProfile}
            onSaved={() => {
              markDone("profile");
              addToast("Profile saved", "success");
            }}
          />
        )}

        {screen === "discover" && (
          <DiscoverScreen
            profile={profile}
            grants={grants}
            setGrants={setGrants}
            selectedIds={selectedIds}
            setSelectedIds={(updater) => {
              setSelectedIds(updater);
              markDone("discover");
            }}
            onFoundGrants={() => markDone("discover")}
            addToast={addToast}
            goProposals={() => goTo("proposals")}
          />
        )}

        {screen === "proposals" && (
          <ProposalsScreen
            profile={profile}
            selectedGrants={selectedGrants}
            drafts={drafts}
            setDrafts={setDrafts}
            addToast={addToast}
            goDiscover={() => goTo("discover")}
          />
        )}
      </main>
    </div>
  );
}
