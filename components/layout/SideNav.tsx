"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Wheat, Sprout, Tractor, Package, Users, Cloud,
  Settings, ClipboardList, DollarSign, ChevronDown, Lock, Wrench,
  MapPin, Leaf, Beef, Palette, UserCog, Bell, Shield,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import LilyIcon from "@/components/LilyIcon";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Nav Structure ───────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string; icon?: React.ElementType }[];
  comingSoon?: boolean;
}

const navSections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Grain360", icon: Wheat, href: "/grain360" },
      { label: "Overview", icon: LayoutDashboard, href: "/overview" },
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
          { label: "Overview", href: "/operations" },
          { label: "Maps", href: "/maps" },
          { label: "Fields", href: "/fields" },
          { label: "Import Data", href: "/operations/import-data" }
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
          { label: "Bin Map", href: "/inventory?tab=bin_map" },
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
      <span className="text-[20px] font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: "var(--ag-logo-text)" }}>
        AG
      </span>
      <div className="w-[1px] h-[18px] rotate-[15deg]" style={{ backgroundColor: "var(--ag-border)" }} />
      <span className="text-[17px] font-normal tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ag-logo-accent)" }}>
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
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
        style={{
          color: isChildActive ? "var(--ag-text-primary)" : "var(--ag-text-secondary)",
          backgroundColor: isChildActive ? "var(--ag-bg-active)" : "transparent",
        }}
        onMouseEnter={(e) => { if (!isChildActive) { e.currentTarget.style.color = "var(--ag-text-primary)"; e.currentTarget.style.backgroundColor = "var(--ag-bg-hover)"; } }}
        onMouseLeave={(e) => { if (!isChildActive) { e.currentTarget.style.color = "var(--ag-text-secondary)"; e.currentTarget.style.backgroundColor = "transparent"; } }}
      >
        <Icon size={15} strokeWidth={1.8} style={{ color: isChildActive ? "var(--ag-accent)" : undefined }} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: "var(--ag-text-muted)" }} />
      </button>
      {open && (
        <div className="ml-[26px] pl-3 mt-0.5 space-y-0.5" style={{ borderLeft: "1px solid var(--ag-border-subtle)" }}>
          {item.children!.map((child) => {
            const active = pathname === child.href;
            return (
              <Link key={child.href} href={child.href}
                className="block px-3 py-1.5 rounded-md text-[12px] transition-colors"
                style={{
                  color: active ? "var(--ag-accent)" : "var(--ag-text-muted)",
                  backgroundColor: active ? "var(--ag-accent-bg)" : "transparent",
                }}>
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
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default" style={{ color: "var(--ag-text-dim)" }}>
        <Icon size={15} strokeWidth={1.8} />
        <span className="flex-1">{item.label}</span>
        <Lock size={11} />
      </div>
    );
  }

  return (
    <Link href={item.href!}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
      style={{
        color: active ? "var(--ag-text-primary)" : "var(--ag-text-secondary)",
        backgroundColor: active ? "var(--ag-bg-active)" : "transparent",
      }}>
      <Icon size={15} strokeWidth={1.8} style={{ color: active ? "var(--ag-accent)" : undefined }} />
      <span>{item.label}</span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SIDE NAV
// ═══════════════════════════════════════════════════════════════
export default function SideNav() {
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  return (
    <aside className="w-56 h-screen flex flex-col fixed left-0 top-0 z-50"
      style={{ backgroundColor: "var(--ag-bg-base)", borderRight: "1px solid var(--ag-border-subtle)" }}>

      {/* ── Logo ──────────────────────────────────────── */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--ag-border-subtle)" }}>
        <Logo />
        <p className="text-[10px] mt-1 tracking-[2px] uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ag-text-muted)" }}>
          FOR THE FARMER
        </p>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-1.5 scrollbar-thin">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-3 mb-2 text-[10px] font-medium tracking-[2px] uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ag-text-dim)" }}>
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

      {/* ── Settings (expandable) ─────────────────────── */}
      <div className="px-2.5 py-2" style={{ borderTop: "1px solid var(--ag-border-subtle)" }}>
        <button onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
          style={{
            color: isSettingsActive ? "var(--ag-text-primary)" : "var(--ag-text-muted)",
            backgroundColor: isSettingsActive ? "var(--ag-bg-active)" : "transparent",
          }}>
          <Settings size={15} strokeWidth={1.8} style={{ color: isSettingsActive ? "var(--ag-accent)" : undefined }} />
          <span className="flex-1 text-left">Settings</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} style={{ color: "var(--ag-text-muted)" }} />
        </button>
        {settingsOpen && (
          <div className="ml-[26px] pl-3 mt-0.5 space-y-0.5" style={{ borderLeft: "1px solid var(--ag-border-subtle)" }}>
            {[
              { label: "Appearance", href: "/settings/appearance", icon: Palette },
              { label: "Account", href: "/settings/account", icon: UserCog },
              { label: "Notifications", href: "/settings/notifications", icon: Bell },
              { label: "Data & Privacy", href: "/settings/privacy", icon: Shield },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] transition-colors"
                  style={{
                    color: active ? "var(--ag-accent)" : "var(--ag-text-muted)",
                    backgroundColor: active ? "var(--ag-accent-bg)" : "transparent",
                  }}>
                  <item.icon size={11} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── User + Theme Toggle ───────────────────────── */}
      <div className="px-4 py-3.5" style={{ borderTop: "1px solid var(--ag-border-subtle)" }}>
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium truncate" style={{ color: "var(--ag-text-primary)" }}>Mike Murphy</p>
            <p className="text-[10px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ag-accent)" }}>
              Pro Trial
            </p>
          </div>
          <ThemeToggle compact />
        </div>
      </div>
    </aside>
  );
}