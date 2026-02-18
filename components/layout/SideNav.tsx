"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wheat,
  Leaf,
  Beef,
  Tractor,
  TrendingUp,
  Sprout,
  Package,
  Users,
  Cloud,
  Bot,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Grain360", href: "/grain360", icon: Wheat },
  { label: "Produce360", href: "/produce360", icon: Leaf },
  { label: "Cattle360", href: "/cattle360", icon: Beef },
  { label: "Machinery", href: "/machinery", icon: Tractor },
  { label: "Marketing", href: "/marketing", icon: TrendingUp },
  { label: "Agronomy", href: "/agronomy", icon: Sprout },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Labour & HR", href: "/labour", icon: Users },
  { label: "Weather", href: "/weather", icon: Cloud },
  { label: "Lily (Advisor)", href: "/advisor", icon: Bot },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E4E7E0] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#E4E7E0]">
        <h1 className="text-2xl font-bold text-[#222527]">
          AG<span className="text-[#4A7C59]">360</span>
        </h1>
        <p className="text-xs text-[#7A8A7C] mt-0.5">Agricultural OS</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#DDE3D6] text-[#4A7C59]"
                  : "text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527]"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Area */}
      <div className="px-4 py-4 border-t border-[#E4E7E0]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-[#F5F5F3]">
          <div className="w-7 h-7 rounded-full bg-[#4A7C59] flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          <div>
            <p className="text-xs font-semibold text-[#222527]">Mike Murphy</p>
            <p className="text-xs text-[#7A8A7C]">Pro Trial</p>
          </div>
        </div>
      </div>
    </aside>
  );
}