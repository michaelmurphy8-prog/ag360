import { SignIn } from "@clerk/nextjs";
const clerkStyles = `
  .cl-socialButtonsIconButton {
    background-color: #1e3320 !important;
    border: 1px solid #3d5c3d !important;
  }
  .cl-socialButtonsIconButton:hover {
    background-color: #2a4a2a !important;
  }
`;

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#080d0a" }}>
        <style dangerouslySetInnerHTML={{ __html: clerkStyles }} />

      {/* Circular outline graphic — top left, matching landing page */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(74, 222, 128, 0.08)" }} />
      <div className="absolute -top-16 -left-16 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(74, 222, 128, 0.05)" }} />

      {/* Subtle green glow center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(74, 222, 128, 0.04) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md px-6 space-y-8">

        {/* Logo — matching landing page style */}
        <div className="text-center space-y-3">
          <div className="text-3xl font-light tracking-widest" style={{ color: "#ffffff", fontFamily: "Georgia, serif" }}>
            AG <span style={{ color: "#4ade80" }}>/</span> <span style={{ color: "#4ade80" }}>360</span>
          </div>
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: "rgba(74, 222, 128, 0.7)" }}>
            For the farmer, by a farmer
          </p>
        </div>

        {/* Sign in card */}
        <SignIn
          forceRedirectUrl="/grain360"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "rounded-2xl p-8",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "border border-[#3d5c3d] bg-[#1a2e1a] rounded-xl transition-colors",
              dividerLine: "bg-[#1a2a1a]",
              dividerText: "text-gray-600 text-xs",
              formFieldLabel: "text-gray-400 text-sm",
              formFieldInput: "rounded-xl border text-white transition-colors",
              formButtonPrimary: "rounded-xl font-medium transition-all text-black",
              footerActionLink: "hover:opacity-80 transition-opacity",
              footerActionText: "text-gray-600",
            },
            variables: {
              colorBackground: "#162016",
              colorInputBackground: "#0a120a",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#6b7280",
              colorPrimary: "#4ade80",
              colorDanger: "#ef4444",
              borderRadius: "0.75rem",
            },
          }}
        />

      </div>
    </main>
  );
}