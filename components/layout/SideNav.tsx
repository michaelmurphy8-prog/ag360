"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wheat, Leaf, Beef, Tractor, TrendingUp,
  Sprout, Package, Users, Cloud, Bot, Settings, ClipboardList
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Grain360", icon: Wheat, href: "/grain360" },
  { label: "Produce360", icon: Leaf, href: "/produce360" },
  { label: "Cattle360", icon: Beef, href: "/cattle360" },
  { label: "Machinery", icon: Tractor, href: "/machinery" },
  { label: "Marketing", icon: TrendingUp, href: "/marketing" },
  { label: "Agronomy", icon: Sprout, href: "/agronomy" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Labour & HR", icon: Users, href: "/labour" },
  { label: "Weather", icon: Cloud, href: "/weather" },
  { label: "Farm Profile", icon: ClipboardList, href: "/farm-profile" },
  { label: "Lily (Advisor)", icon: Bot, href: "/advisor" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-white border-r border-[#E4E7E0] flex flex-col fixed left-0 top-0">
      <div className="px-6 py-6 border-b border-[#E4E7E0]">
        <h1 className="text-xl font-bold text-[#222527]">
          AG<span className="text-[#4A7C59]">360</span>
        </h1>
        <p className="text-xs text-[#7A8A7C] mt-0.5">Agricultural OS</p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                active
                  ? "bg-[#DDE3D6] text-[#4A7C59]"
                  : "text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527]"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#E4E7E0]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center text-sm font-bold text-[#4A7C59]">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-[#222527]">Mike Murphy</p>
            <p className="text-xs text-[#4A7C59] font-medium">Pro Trial</p>
          </div>
        </div>
      </div>
    </aside>
  );
}