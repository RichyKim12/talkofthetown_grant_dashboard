// app/layout.tsx or app/layout.jsx
import "./globals.css"; // Next.js baseline style

// Import every stylesheet from image_91800a.png sequentially
import "@/styles/App.css";
import "@/styles/Buttons.css";
import "@/styles/Discover.css";
import "@/styles/GrantCard.css";
import "@/styles/Layout.css";
import "@/styles/Profile.css";
import "@/styles/Proposals.css";
import "@/styles/Sidebar.css";
import "@/styles/Toast.css";

export const metadata = {
  title: "Grant Sourcing Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Your app views (page.tsx) render right here */}
        {children}
      </body>
    </html>
  );
}