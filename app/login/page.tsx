import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-[#222527]">
            AG<span className="text-[#4A7C59]">360</span>
          </h1>
          <p className="text-[#7A8A7C] text-sm">Sign in to your account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white rounded-[20px] shadow-sm border border-[#E4E7E0] p-8",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              formButtonPrimary: "bg-[#4A7C59] hover:bg-[#3d6b4a] text-white rounded-full",
              footerActionLink: "text-[#4A7C59] hover:text-[#3d6b4a]",
            },
          }}
        />
      </div>
    </main>
  );
}