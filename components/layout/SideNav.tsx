"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Upload, Database, DollarSign, Lock, BookOpen, Receipt } from "lucide-react";
import {
  LayoutDashboard, Wheat, Leaf, Beef, Tractor, TrendingUp,
  Sprout, Package, Users, Cloud, Bot, Settings, ClipboardList,
  BarChart2, ChevronDown, Map, FileText,
} from "lucide-react";

type SubItem = {
  label: string;
  href: string;
  icon?: React.ElementType;
};

type NavItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  subItems?: SubItem[];
};

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Grain360", icon: Wheat, href: "/grain360" },
  {
    label: "Finance",
    icon: DollarSign,
    href: "/finance",
    subItems: [
      { label: "Market Prices", href: "/grain360/prices", icon: BarChart2 },
{ label: "Marketing", href: "/marketing", icon: TrendingUp },
{ label: "P&L", href: "/finance/pnl", icon: BookOpen },
{ label: "Contracts", href: "/finance/contracts", icon: FileText },
{ label: "Ledger", href: "/finance/ledger", icon: Receipt },
    ],
  },
  {
    label: "Agronomy",
    icon: Sprout,
    href: "/agronomy",
    subItems: [
      { label: "Weather", href: "/weather", icon: Cloud },
    ],
  },
  
  {
    label: "Fields",
    icon: Map,
    href: "/fields",
    subItems: [
      { label: "Import Data", href: "/grain360/imports", icon: Upload },
    ],
  },
  { label: "Operations", icon: Database, href: "/grain360/operations" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Machinery", icon: Tractor, href: "/machinery" },
  { label: "Labour & HR", icon: Users, href: "/labour" },
  { label: "Farm Profile", icon: ClipboardList, href: "/farm-profile" },
  { label: "Lily (Advisor)", icon: Bot, href: "/advisor" },
];

const comingSoonItems: { label: string; icon: React.ElementType }[] = [
  { label: "Produce360", icon: Leaf },
  { label: "Cattle360", icon: Beef },
];

export default function SideNav() {
  const pathname = usePathname();

  // Track which collapsible sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (href: string) => {
    setOpenSections((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  // Auto-open a section if the current path is inside it
  const isSectionOpen = (item: NavItem) => {
    // Explicitly toggled
    if (openSections[item.href] !== undefined) return openSections[item.href];
    // Auto-open if active
    if (pathname === item.href) return true;
    if (pathname.startsWith(item.href + "/")) return true;
    if (item.subItems?.some((s) => pathname === s.href)) return true;
    return false;
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-[#E4E7E0] flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#E4E7E0] flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-[#4A7C59] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" />
              <circle cx="7" cy="7" r="2" fill="white" />
              <line x1="7" y1="1" x2="7" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="7" y1="10" x2="7" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="1" y1="7" x2="4" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#222527]">
            AG<span className="text-[#4A7C59]">360</span>
          </h1>
        </div>
        <p className="text-[11px] font-medium text-[#7A8A7C] tracking-widest uppercase">
          For the Farmer
        </p>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isParentOfActive = item.subItems?.some((s) => pathname === s.href);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = hasSubItems ? isSectionOpen(item) : false;

          return (
            <div key={item.href}>
              {/* Parent item */}
              {hasSubItems ? (
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    onClick={() => { if (!isOpen) toggleSection(item.href) }}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-l-[10px] text-sm font-medium transition-colors ${
                      isActive || isParentOfActive
                        ? "bg-[#DDE3D6] text-[#4A7C59]"
                        : "text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527]"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </Link>
                  <button
                    onClick={() => toggleSection(item.href)}
                    className={`px-2 py-2.5 rounded-r-[10px] transition-colors ${
                      isActive || isParentOfActive
                        ? "bg-[#DDE3D6] text-[#4A7C59]"
                        : "text-[#7A8A7C] hover:bg-[#F5F5F3]"
                    }`}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  </button>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#DDE3D6] text-[#4A7C59]"
                      : "text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527]"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              )}

              {/* Sub items */}
              {hasSubItems && isOpen && (
                <div className="ml-6 mt-0.5 space-y-0.5 border-l border-[#E4E7E0] pl-3">
                  {item.subItems!.map((sub) => {
                    const SubIcon = sub.icon || BarChart2;
                    const subActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs font-medium transition-colors ${
                          subActive
                            ? "bg-[#DDE3D6] text-[#4A7C59]"
                            : "text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527]"
                        }`}
                      >
                        <SubIcon size={13} />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Coming Soon Section */}
        <div className="pt-3 mt-3 border-t border-[#E4E7E0]">
          <p className="px-3 text-[10px] font-semibold text-[#B0B8B0] uppercase tracking-wider mb-2">
            Coming Soon
          </p>
          {comingSoonItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium text-[#C5CBC5] cursor-default"
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                <Lock size={12} className="text-[#D4D9D4]" />
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom: Settings + User */}
      <div className="border-t border-[#E4E7E0]">
        <div className="px-3 py-2">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-[#DDE3D6] text-[#4A7C59]"
                : "text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527]"
            }`}
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>
        </div>
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
      </div>
    </aside>
  );
}