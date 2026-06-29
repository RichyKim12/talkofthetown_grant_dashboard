/* ============================================================
   PALETTES
   Three options, all light-background / high-contrast, built
   for readability first. Named for what they evoke, not for
   trendiness — this is a tool for a small language-services
   and cultural-tours business, used by staff who may not be
   power users of software.

   Each palette is a flat object of CSS custom properties that
   gets applied to the app root's inline style. Add a new
   palette by adding a new key here — the switcher UI picks it
   up automatically.
   ============================================================ */

export const PALETTES = {
  harvest: {
    label: "Harvest",
    blurb: "Warm terracotta & sage — earthy, calm, food & garden roots",
    "--bg-page": "#FBF6EF",
    "--bg-sidebar": "#3A3530",
    "--bg-sidebar-active": "#4E463D",
    "--bg-card": "#FFFFFF",
    "--bg-card-soft": "#F4EDE2",
    "--text-on-sidebar": "#F3EEE6",
    "--text-on-sidebar-muted": "#C9BFAF",
    "--text-primary": "#2B2622",
    "--text-secondary": "#6B6358",
    "--text-muted": "#948C7E",
    "--accent": "#B5572C",
    "--accent-dark": "#8E4220",
    "--accent-soft": "#F3E0D2",
    "--accent-contrast": "#FFFFFF",
    "--success": "#5B7A3A",
    "--success-soft": "#E6EEDA",
    "--border": "#E6DCCB",
    "--border-strong": "#D6C8AC",
    "--focus-ring": "#B5572C",
    "--chip-bg": "#EFE4D3",
    "--chip-text": "#6B4A2C",
    "--danger": "#A23B2E",
    "--danger-soft": "#F6E1DC",
  },
  meadow: {
    label: "Meadow",
    blurb: "Sage green & cream — fresh, garden-forward, low-glare",
    "--bg-page": "#F7F8F2",
    "--bg-sidebar": "#33402F",
    "--bg-sidebar-active": "#45543F",
    "--bg-card": "#FFFFFF",
    "--bg-card-soft": "#EEF1E5",
    "--text-on-sidebar": "#F1F4EC",
    "--text-on-sidebar-muted": "#C2CCB8",
    "--text-primary": "#272B23",
    "--text-secondary": "#5E6657",
    "--text-muted": "#8B9282",
    "--accent": "#4F7A3D",
    "--accent-dark": "#3B5C2D",
    "--accent-soft": "#DEEBD3",
    "--accent-contrast": "#FFFFFF",
    "--success": "#3F7A52",
    "--success-soft": "#DCEEE0",
    "--border": "#DDE3D3",
    "--border-strong": "#C7D0B9",
    "--focus-ring": "#4F7A3D",
    "--chip-bg": "#E5EEDB",
    "--chip-text": "#3D5A30",
    "--danger": "#A23B2E",
    "--danger-soft": "#F6E1DC",
  },
  harbor: {
    label: "Harbor",
    blurb: "Navy & warm gold — crisp, formal, highest contrast",
    "--bg-page": "#F6F7F9",
    "--bg-sidebar": "#1E2A3D",
    "--bg-sidebar-active": "#293A52",
    "--bg-card": "#FFFFFF",
    "--bg-card-soft": "#ECEFF4",
    "--text-on-sidebar": "#F1F4F9",
    "--text-on-sidebar-muted": "#A9B6C8",
    "--text-primary": "#1B2433",
    "--text-secondary": "#566175",
    "--text-muted": "#8995A8",
    "--accent": "#B8821E",
    "--accent-dark": "#8E6315",
    "--accent-soft": "#F2E5C6",
    "--accent-contrast": "#1B2433",
    "--success": "#2E7D5B",
    "--success-soft": "#DCEFE6",
    "--border": "#DEE2E9",
    "--border-strong": "#C7CDD9",
    "--focus-ring": "#1E2A3D",
    "--chip-bg": "#E7EBF1",
    "--chip-text": "#2C3B52",
    "--danger": "#B23A3A",
    "--danger-soft": "#F6E0DF",
  },
};
