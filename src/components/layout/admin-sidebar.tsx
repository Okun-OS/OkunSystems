"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  UserCircle,
  Package,
  Library,
  Receipt,
  Monitor,
} from "lucide-react";
import { OkunLogo } from "./okun-logo";
import { cn } from "@/lib/utils";
import { teamRoleLabel } from "@/lib/team/roles";

/**
 * `closing` = sichtbar für wer Closing-Gespräche führt.
 * `strategie` = sichtbar für wer Strategiegespräche führt.
 * Ein Administrator sieht alles.
 */
const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Übersicht", closing: false, strategie: false },
  { href: "/admin/sales", icon: TrendingUp, label: "Sales & Closing", closing: true, strategie: false },
  { href: "/admin/kunden", icon: Users, label: "Kunden", closing: false, strategie: true },
  { href: "/admin/lernen", icon: BookOpen, label: "Learning Library", closing: false, strategie: false },
  { href: "/admin/termine", icon: Calendar, label: "Termine", closing: false, strategie: false },
  { href: "/admin/dokumente", icon: FileText, label: "Dokumente", closing: false, strategie: false },
  { href: "/admin/einstellungen", icon: Settings, label: "Einstellungen", closing: false, strategie: false },
];

const salesSubItems = [
  { href: "/admin/sales", label: "Dashboard", icon: TrendingUp, exact: true, closing: true },
  { href: "/admin/sales/leads", label: "Leads", icon: UserCircle, closing: true },
  { href: "/admin/sales/angebote", label: "Angebote", icon: Package, closing: false },
  { href: "/admin/sales/bibliothek", label: "Bibliothek", icon: Library, closing: false },
  { href: "/admin/sales/rechnungen", label: "Rechnungen", icon: Receipt, closing: false },
  {
    href: "/admin/sales/praesentationen",
    label: "Präsentationen",
    icon: Monitor,
    closing: false,
  },
];

interface AdminSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    canStrategy?: boolean | null;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  // Jeder sieht nur seine Bereiche. Die Anzeige folgt damit derselben Regel,
  // die serverseitig ohnehin durchgesetzt wird — sie ersetzt sie nicht.
  const istAdmin = user.role === "ADMIN";
  const darfClosing = user.role === "CLOSER";
  const darfStrategie = user.canStrategy === true;

  const sichtbar = (item: { closing: boolean; strategie: boolean }) =>
    istAdmin || (darfClosing && item.closing) || (darfStrategie && item.strategie);

  const visibleNav = navItems.filter(sichtbar);
  const visibleSubItems = salesSubItems.filter((item) => istAdmin || (darfClosing && item.closing));

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#060a10] border-r border-[#111e30] flex flex-col z-40">
      <div className="px-5 py-2 border-b border-[#111e30]">
        <OkunLogo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {visibleNav.map((item) => {
          const isSales = item.href === "/admin/sales";
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
                    : "text-[#8899b4] hover:text-[#eef2f7] hover:bg-[#101c2e]"
                )}
              >
                <item.icon size={17} />
                <span>{item.label}</span>
              </Link>

              {/* Sales sub-navigation */}
              {isSales && isActive && (
                <div className="ml-4 pl-3 border-l border-[#1a2840] mb-1">
                  {visibleSubItems.map((sub) => {
                    const subActive = sub.exact
                      ? pathname === sub.href
                      : pathname === sub.href || pathname.startsWith(sub.href + "/");
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-xs font-medium transition-all",
                          subActive
                            ? "text-[#00b8ff] bg-[rgba(0,184,255,0.08)]"
                            : "text-[#667] hover:text-[#c0cce0] hover:bg-[#101c2e]"
                        )}
                      >
                        <sub.icon size={13} />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#111e30]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0c1520]">
          <div className="w-8 h-8 rounded-full bg-[#00b8ff]/15 border border-[#00b8ff]/25 flex items-center justify-center flex-shrink-0">
            <span className="text-[#00b8ff] text-xs font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#eef2f7] text-xs font-medium truncate">{user.name}</p>
            <p className="text-[#00b8ff] text-xs font-medium">
              {teamRoleLabel(user)}
            </p>
          </div>
          <ChevronDown size={14} className="text-[#8899b4] flex-shrink-0" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mt-1 text-[#8899b4] hover:text-red-400 hover:bg-[#101c2e] text-sm w-full transition-colors"
        >
          <LogOut size={15} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
