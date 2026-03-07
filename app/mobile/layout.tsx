// app/mobile/layout.tsx
// Shared wrapper for all mobile pages — fixed viewport, dark base, safe areas

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "AG360",
  description: "For the Farmer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AG360",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070D18",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#070D18",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        // Safe areas for notch + home indicator
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {children}
    </div>
  );
}