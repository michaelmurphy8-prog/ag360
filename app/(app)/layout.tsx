// app/(app)/layout.tsx
// AG360 App Shell — dark theme matching landing page design language

import SideNav from "@/components/layout/SideNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--ag-bg-primary)" }}>
      <SideNav />
      <main className="flex-1 ml-56 p-6">
        {children}
      </main>
    </div>
  );
}