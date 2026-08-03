import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Users,
  FolderKanban,
  Ticket,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [totalClients, activeProjects, openTickets, upcomingAppointments, recentCompanies] =
    await Promise.all([
      db.company.count(),
      db.project.count({ where: { status: { in: ["ACTIVE", "PLANNING"] } } }),
      db.retainerTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      db.appointment.count({
        where: { startTime: { gte: new Date() }, status: "SCHEDULED" },
      }),
      db.company.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          projects: { take: 1, orderBy: { updatedAt: "desc" } },
          assessments: { take: 1, orderBy: { updatedAt: "desc" } },
        },
      }),
    ]);

  const stats = [
    { label: "Aktive Kunden", value: totalClients, icon: Users, change: "+2 diesen Monat" },
    { label: "Laufende Projekte", value: activeProjects, icon: FolderKanban, change: "In Bearbeitung" },
    { label: "Offene Tickets", value: openTickets, icon: Ticket, change: "Retainer & Support" },
    { label: "Termine diese Woche", value: upcomingAppointments, icon: CalendarDays, change: "Nächster Schritt" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Admin Dashboard</h1>
        <p className="text-[#888] text-sm mt-1">OKUN Systems — Interne Übersicht</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 hover:border-[#00b8ff]/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#00b8ff]/10 flex items-center justify-center">
                <stat.icon size={18} className="text-[#00b8ff]" />
              </div>
              <ArrowUpRight size={14} className="text-[#555]" />
            </div>
            <p className="text-[#f0f0f0] text-3xl font-bold">{stat.value}</p>
            <p className="text-[#888] text-xs mt-1">{stat.label}</p>
            <p className="text-[#00b8ff] text-xs mt-2 flex items-center gap-1">
              <TrendingUp size={11} />
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Recent Clients */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#1a2840]">
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Zuletzt aktualisierte Kunden</h2>
              <Link
                href="/admin/kunden"
                className="text-[#00b8ff] text-xs hover:text-[#0099d6] transition-colors"
              >
                Alle anzeigen →
              </Link>
            </div>
            <div className="divide-y divide-[#111e30]">
              {recentCompanies.length === 0 ? (
                <div className="p-8 text-center text-[#555] text-sm">
                  Noch keine Kunden vorhanden.{" "}
                  <Link href="/admin/kunden" className="text-[#00b8ff] hover:underline">
                    Ersten Kunden anlegen →
                  </Link>
                </div>
              ) : (
                recentCompanies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/admin/kunden/${company.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-[#101c2e] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#111e30] border border-[#1a2840] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00b8ff] text-xs font-bold">
                        {company.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f0f0f0] text-sm font-medium">{company.name}</p>
                      <p className="text-[#888] text-xs">{company.industry ?? "Keine Branche"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <StatusBadge status={company.status} />
                      <p className="text-[#555] text-xs mt-1">
                        {formatDateTime(company.updatedAt)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Schnellzugriff</h2>
            <div className="space-y-2">
              {[
                { href: "/admin/kunden/neu", icon: Users, label: "Kunden anlegen" },
                { href: "/admin/analysen", icon: TrendingUp, label: "Analyse starten" },
                { href: "/admin/termine", icon: CalendarDays, label: "Termin erstellen" },
                { href: "/admin/dokumente", icon: FolderKanban, label: "Dokument hochladen" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#101c2e] hover:bg-[#00b8ff]/10 hover:border-[#00b8ff]/20 border border-transparent transition-colors"
                >
                  <action.icon size={15} className="text-[#00b8ff]" />
                  <span className="text-[#f0f0f0] text-sm">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={15} className="text-[#f59e0b]" />
              Offene Aufgaben
            </h2>
            {openTickets > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#101c2e] rounded-lg">
                  <span className="text-[#888] text-xs">Support-Tickets</span>
                  <span className="bg-[#f59e0b]/10 text-[#f59e0b] text-xs px-2 py-0.5 rounded-full font-medium">
                    {openTickets} offen
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#00b8ff] text-sm">
                <Clock size={14} />
                <span>Keine offenen Aufgaben</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; class: string }> = {
    ACTIVE: { label: "Aktiv", class: "bg-[#00b8ff]/10 text-[#00b8ff]" },
    ONBOARDING: { label: "Onboarding", class: "bg-[#f59e0b]/10 text-[#f59e0b]" },
    INACTIVE: { label: "Inaktiv", class: "bg-[#888]/10 text-[#888]" },
  };
  const cfg = configs[status] ?? { label: status, class: "bg-[#888]/10 text-[#888]" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}
