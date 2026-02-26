// app/page.tsx
// Public landing page — unauthenticated users see this.
// Authenticated users get redirected to /dashboard by middleware.

import LandingPage from "@/components/marketing/LandingPage";

export default function Home() {
  return <LandingPage />;
}