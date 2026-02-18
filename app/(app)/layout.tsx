import SideNav from "@/components/layout/SideNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F5F3] flex">
      <SideNav />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}