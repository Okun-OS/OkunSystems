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
} from "lucide-react";
import { OkunLogo } from "./okun-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Übersicht" },
  { href: "/admin/sales", icon: TrendingUp, label: "Sales & Closing" },
  { href: "/admin/kunden", icon: Users, label: "Kunden" },
  { href: "/admin/lernen", icon: BookOpen, label: "Learning Library" },
  { href: "/admin/termine", icon: Calendar, label: "Termine" },
  { href: "/admin/dokumente", icon: FileText, label: "Dokumente" },
  { href: "/admin/einstellungen", icon: Settings, label: "Einstellungen" },
];

interface AdminSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#060a10] border-r border-[#111e30] flex flex-col z-40">
      <div className="px-5 py-2 border-b border-[#111e30]">
        <OkunLogo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin/kunden"
              ? pathname === item.href || pathname.startsWith(item.href + "/")
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
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
            <p className="text-[#00b8ff] text-xs font-medium">Administrator</p>
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
