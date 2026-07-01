"use client";

import React, { useState, useEffect } from "react";
import { PALETTES } from "@/data/palettes";
// import { SEED_PROFILE } from "@/data/mockData";
import { Toast, useToasts } from "@/components/Toast";
import { ProgressSteps } from "@/components/ProgressSteps";
import { PaletteSwitcher } from "@/components/PaletteSwitcher";
import { IconClipboard } from "@/components/icons";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { DiscoverScreen } from "@/components/screens/DiscoverScreen";
import { ProposalsWorkspaceScreen } from "@/components/screens/ProposalsWorkspaceScreen";

interface ProfileData {
  orgName: string;
  yearFounded: string;
  employees: string;
  annualIncome: string;
  serviceArea: string;
  mission: string;
  focuses: string[];
  customFocuses: string[];
}

export default function DashboardRoot() {
  const [paletteKey, setPaletteKey] = useState<keyof typeof PALETTES>("harvest");
  const [screen, setScreen] = useState("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [grants, setGrants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { toasts, addToast, dismissToast } = useToasts();
  const palette = PALETTES[paletteKey];

  // Hydrate grants + selected IDs from sessionStorage once, on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedGrants = sessionStorage.getItem("discovered_grants");
      if (savedGrants) {
        const parsed = JSON.parse(savedGrants);
        if (parsed.length > 0) setGrants(parsed);
      }
      const savedIds = sessionStorage.getItem("selected_grant_ids");
      if (savedIds) setSelectedIds(JSON.parse(savedIds));
    } catch {}
  }, []);

  // Keep sessionStorage in sync whenever grants or selectedIds change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("discovered_grants", JSON.stringify(grants));
  }, [grants]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("selected_grant_ids", JSON.stringify(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (data.profile) {
          setProfile(data.profile);
        } else {
          setProfile({
            orgName: "",
            yearFounded: "",
            employees: "",
            annualIncome: "",
            serviceArea: "",
            mission: "",
            focuses: [],
            customFocuses: []
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return <div className="screen-loading">Loading configuration profile...</div>;
  }

  const cssVars = Object.fromEntries(
    Object.entries(palette).filter(([k]) => k.startsWith("--"))
  );

  const markDone = (key: string) => setCompleted((prev) => new Set(prev).add(key));
  const selectedGrants = grants.filter((g: any) => selectedIds.includes(g.id));

  const goTo = (key: string) => {
    setScreen(key);
    setNavOpen(false);
  };

  const isProposals = screen === "proposals";

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
            <p className="brand-name">{profile?.orgName || "Dashboard"}</p>
            <p className="brand-sub">Grant assistant</p>
          </div>
        </div>
        <ProgressSteps current={screen} onJump={goTo} completed={completed} />
        <div className="sidebar-footer">
          <PaletteSwitcher paletteKey={paletteKey} setPaletteKey={setPaletteKey as any} />
        </div>
      </aside>

      {/* DYNAMIC HEIGHT, MAX-WIDTH, AND PADDING CONTROL */}
      <main 
        className="main-area" 
        style={
          isProposals 
            ? { 
                maxWidth: "none", 
                width: "100%", 
                height: "100vh", 
                maxHeight: "100vh",
                overflow: "hidden", 
                padding: 0 // Eliminate conflicting parent paddings for workspace boundaries
              } 
            : undefined
        }
      >
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
            setSelectedIds={(updater: any) => {
              setSelectedIds(updater);
              markDone("discover");
            }}
            onFoundGrants={() => markDone("discover")}
            addToast={addToast}
            goProposals={() => goTo("proposals")}
          />
        )}

        {screen === "proposals" && (
          <ProposalsWorkspaceScreen
            profile={profile}
            selectedGrants={selectedGrants}
            drafts={drafts}
            setDrafts={setDrafts}
            addToast={addToast}
            goDiscover={() => goTo("discover")}
            onRemoveSelected={(grantId: string) =>
              setSelectedIds((prev) => prev.filter((id) => id !== grantId))
            }
          />
        )}
      </main>
    </div>
  );
}