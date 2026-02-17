import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        
        {/* Logo */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-[#222527]">
            AG<span className="text-[#4A7C59]">360</span>
          </h1>
          <p className="text-[#7A8A7C] text-lg">
            The modern operating system for Canadian agriculture.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-3 gap-4">
          {["Grain360", "Produce360", "Cattle360"].map((pillar) => (
            <div
              key={pillar}
              className="bg-white rounded-[20px] shadow-sm border border-[#E4E7E0] p-6"
            >
              <p className="text-sm font-semibold text-[#4A7C59]">{pillar}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-[#4A7C59] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#3d6b4a] transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="bg-white text-[#222527] px-8 py-3 rounded-full font-semibold border border-[#E4E7E0] hover:bg-[#F5F5F3] transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="text-[#7A8A7C] text-sm">
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </main>
  );
}