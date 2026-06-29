"use client";

import React, { useState } from "react";
import { PALETTES } from "@/data/palettes";
import { SEED_PROFILE } from "@/data/mockData";
import { Toast, useToasts } from "@/components/Toast";
import { ProgressSteps } from "@/components/ProgressSteps";
import { PaletteSwitcher } from "@/components/PaletteSwitcher";
import { IconClipboard } from "@/components/icons";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { DiscoverScreen } from "@/components/screens/DiscoverScreen";
import { ProposalsScreen } from "@/components/screens/ProposalsScreen";

export default function DashboardRoot() {
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
  const cssVars = Object.fromEntries(
    Object.entries(palette).filter(([k]) => k.startsWith("--"))
  );

  const markDone = (key) => setCompleted((prev) => new Set(prev).add(key));

  const selectedGrants = grants.filter((g) => selectedIds.includes(g.id));

  const goTo = (key) => {
    setScreen(key);
    setNavOpen(false);
  };

  return (
    <div className="app-root" style={cssVars as React.CSSProperties}>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <button 
        className="mobile-nav-toggle" 
        onClick={() => setNavOpen((o) => !o)} 
        aria-label="Toggle navigation"
      >
        <IconClipboard width={20} height={20} />
      </button>

      <aside className={`sidebar${navOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">LV</div>
          <div>
            <p className="brand-name">
              {profile.orgName ? profile.orgName.split(" ").slice(0, 2).join(" ") : "Dashboard"}
            </p>
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