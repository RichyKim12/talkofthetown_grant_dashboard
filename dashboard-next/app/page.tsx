"use client";

import React, { useState, useEffect } from "react";
import { PALETTES } from "@/data/palettes";
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
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { toasts, addToast, dismissToast } = useToasts();
  const palette = PALETTES[paletteKey];

  // Dynamically map palette colors to style objects
  const cssVars = Object.fromEntries(
    Object.entries(palette).filter(([k]) => k.startsWith("--"))
  );

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

  // --- AESTHETICALLY PLEASING LOADING COMPONENT ---
  if (loading) {
    return (
      <div 
        style={{
          ...cssVars,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          height: "100vh",
          backgroundColor: "var(--bg-app, #f9fafb)",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
          .loader-spin { animation: spin 0.8s linear infinite; }
          .loader-pulse { animation: pulse 1.8s ease-in-out infinite; }
        `}</style>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
          {/* Minimalist Micro-Indicator Spinner */}
          <div 
            className="loader-spin"
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid var(--border, #e5e7eb)",
              borderTopColor: "var(--accent, #2563eb)",
              borderRadius: "50%"
            }} 
          />
          
          {/* Subtle text block */}
          <div style={{ textAlign: "center" }}>
            <h2 
              className="loader-pulse"
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--text-primary, #111827)"
              }}
            >
              Loading workspace
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted, #6b7280)" }}>
              Initializing configuration metrics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const markDone = (key: string) => setCompleted((prev) => new Set(prev).add(key));
  const selectedGrants = grants.filter((g: any) => selectedIds.includes(g.id)) as any[];

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
          {/* <div className="brand-mark">LV</div> */}
          <div>
            <p className="brand-name">{profile?.orgName || "Dashboard"}</p>
            <p className="brand-sub">Grant assistant dashboard</p>
          </div>
        </div>
        <ProgressSteps current={screen} onJump={goTo} completed={completed} />
        <div className="sidebar-footer">
          <PaletteSwitcher paletteKey={paletteKey} setPaletteKey={setPaletteKey as any} />
        </div>
      </aside>

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
                padding: 0 
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
            selectedGrants={selectedGrants as never[]}
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