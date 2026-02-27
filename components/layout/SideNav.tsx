"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Wheat, Sprout, Tractor, Package, Users, Cloud,
  Settings, ClipboardList, DollarSign, ChevronDown, Lock, Wrench,
  MapPin, Leaf, Beef, TrendingUp, Map,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import LilyIcon from "@/components/LilyIcon";

// ─── Nav Structure ───────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string }[];
  comingSoon?: boolean;
}

const navSections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/overview" },
      { label: "Grain360", icon: Wheat, href: "/grain360" },
    ],
  },
  {
    items: [
      {
        label: "Finance", icon: DollarSign,
        children: [
          { label: "Ledger", href: "/finance/ledger" },
          { label: "P&L", href: "/finance/pnl" },
          { label: "Marketing", href: "/marketing" },
        ],
      },
      { label: "Agronomy", icon: Sprout, href: "/agronomy" },
      {
        label: "Operations", icon: Wrench,
        children: [
          { label: "Fields", href: "/fields" },
        ],
      },
    ],
  },
  {
    items: [
      {
        label: "Inventory", icon: Package,
        children: [
          { label: "Inventory", href: "/inventory" },
          { label: "Bin Map", href: "/inventory/bin-map" },
        ],
      },
      { label: "Machinery", icon: Tractor, href: "/machinery" },
      { label: "Labour & HR", icon: Users, href: "/labour" },
      { label: "Farm Profile", icon: ClipboardList, href: "/farm-profile" },
      { label: "Weather", icon: Cloud, href: "/weather" },
      { label: "Lily (Advisor)", icon: LilyIcon, href: "/advisor" },
    ],
  },
  {
    title: "COMING SOON",
    items: [
      { label: "Produce360", icon: Leaf, comingSoon: true },
      { label: "Cattle360", icon: Beef, comingSoon: true },
      { label: "Connect360", icon: MapPin, comingSoon: true },
    ],
  },
];

// ─── T5 Logo (Slash Divider) ─────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[20px] font-bold text-[#F1F5F9] tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
        AG
      </span>
      <div className="w-[1px] h-[18px] bg-white/20 rotate-[15deg]" />
      <span className="text-[17px] font-normal text-[#34D399] tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        360
      </span>
    </div>
  );
}

// ─── Expandable Nav Group ────────────────────────────────────
function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isChildActive = item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;
  const [open, setOpen] = useState(isChildActive);
  const Icon = item.icon;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isChildActive
            ? "text-[#F1F5F9] bg-white/[0.04]"
            : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.04]"
        }`}
      >
        <Icon size={15} strokeWidth={1.8} className={isChildActive ? "text-[#34D399]" : ""} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 text-[#64748B] ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-[26px] pl-3 border-l border-white/[0.06] mt-0.5 space-y-0.5">
          {item.children!.map((child) => {
            const active = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                  active
                    ? "text-[#34D399] bg-[#34D399]/[0.08]"
                    : "text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.03]"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single Nav Link ─────────────────────────────────────────
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(item.href + "/");

  if (item.comingSoon) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[#475569] cursor-default">
        <Icon size={15} strokeWidth={1.8} />
        <span className="flex-1">{item.label}</span>
        <Lock size={11} className="text-[#475569]" />
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
        active
          ? "text-[#F1F5F9] bg-white/[0.06]"
          : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.04]"
      }`}
    >
      <Icon
        size={15}
        strokeWidth={1.8}
        className={active ? "text-[#34D399]" : ""}
      />
      <span>{item.label}</span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SIDE NAV
// ═══════════════════════════════════════════════════════════════
export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-screen bg-[#080C15] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-50">

      {/* ── Logo ──────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Logo />
        <p
          className="text-[10px] text-[#64748B] mt-1 tracking-[2px] uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          FOR THE FARMER
        </p>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4 scrollbar-thin">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p
                className="px-3 mb-2 text-[10px] font-medium text-[#475569] tracking-[2px] uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.children ? (
                  <NavGroup key={item.label} item={item} pathname={pathname} />
                ) : (
                  <NavLink key={item.label} item={item} pathname={pathname} />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Settings ──────────────────────────────────── */}
      <div className="px-2.5 py-2 border-t border-white/[0.06]">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
            pathname === "/settings"
              ? "text-[#F1F5F9] bg-white/[0.06]"
              : "text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.04]"
          }`}
        >
          <Settings size={15} strokeWidth={1.8} />
          <span>Settings</span>
        </Link>
      </div>

      {/* ── User ──────────────────────────────────────── */}
      <div className="px-4 py-3.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-7 h-7",
              },
            }}
          />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#F1F5F9] truncate">Mike Murphy</p>
            <p
              className="text-[10px] text-[#34D399] font-medium"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Pro Trial
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}