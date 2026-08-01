"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Brain,
  FolderKanban,
  Calendar,
  FileText,
  Headphones,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  BookOpen,
  Home,
  Layers,
  User,
  LifeBuoy,
} from "lucide-react";
import { OkunLogo } from "./okun-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/portal", icon: Home, label: "Portal", exact: true },
  { href: "/portal/lernen", icon: BookOpen, label: "Lernbereich" },
  { href: "/portal/dokumente", icon: FileText, label: "Dokumente" },
  { href: "/portal/projekt", icon: Layers, label: "Projektstatus" },
  { href: "/portal/blueprint", icon: Brain, label: "Blueprint-Bericht" },
  { href: "/portal/profil", icon: User, label: "Profil" },
  { href: "/portal/hilfe", icon: LifeBuoy, label: "Hilfe" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/blueprint", icon: Brain, label: "OKUN Blueprint™" },
  { href: "/projektstatus", icon: FolderKanban, label: "Projektstatus" },
  { href: "/termine", icon: Calendar, label: "Termine" },
  { href: "/dokumente", icon: FileText, label: "Alle Dokumente" },
  { href: "/retainer", icon: Headphones, label: "Retainer & Betreuung" },
  { href: "/nachrichten", icon: MessageSquare, label: "Nachrichten" },
  { href: "/einstellungen", icon: Settings, label: "Einstellungen" },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    companyName?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0d0d0d] border-r border-[#1e1e1e] flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 pb-4 border-b border-[#1e1e1e]">
        <OkunLogo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[rgba(34,197,94,0.12)] text-[#22c55e]"
                  : "text-[#888] hover:text-[#f0f0f0] hover:bg-[#1a1a1a]"
              )}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[#1e1e1e]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#141414] cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#22c55e] text-xs font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#f0f0f0] text-xs font-medium truncate">{user.name}</p>
            <p className="text-[#555] text-xs truncate">{user.companyName ?? user.email}</p>
          </div>
          <ChevronDown size={14} className="text-[#555] flex-shrink-0" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mt-1 text-[#666] hover:text-red-400 hover:bg-[#1a1a1a] text-sm w-full transition-colors"
        >
          <LogOut size={15} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
