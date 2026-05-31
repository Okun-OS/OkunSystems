import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BarChart3, CheckCircle2, Clock, ChevronRight, Play, Lock } from "lucide-react";

const QUESTIONS = [
  { id: 1, category: "Strategie", text: "Haben Sie eine klar definierte Unternehmensstrategie für die nächsten 3 Jahre?", done: true },
  { id: 2, category: "Strategie", text: "Wie gut kennen Sie Ihre wichtigsten Wettbewerber?", done: true },
  { id: 3, category: "Operations", text: "Wie organisieren Sie aktuell die Dienstplanung?", done: true },
  { id: 4, category: "Operations", text: "Welche Software nutzen Sie für die Dokumentation?", active: true },
  { id: 5, category: "Technologie", text: "Wie digital sind Ihre internen Prozesse?", done: false },
  { id: 6, category: "Marketing", text: "Über welche Kanäle gewinnen Sie neue Kunden?", done: false },
];

export default async function AnalysePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: { company: { include: { assessments: { take: 1, orderBy: { updatedAt: "desc" } } } } },
  });

  if (!user) redirect("/login");

  const assessment = user.company?.assessments[0];
  const progress = 65;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">OKUN FirstScan</h1>
        <p className="text-[#888] text-sm mt-1">Unternehmensanalyse — {user.company?.name}</p>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 col-span-3 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#888] text-xs font-medium uppercase tracking-wider">Gesamtfortschritt</span>
            <BarChart3 size={16} className="text-[#22c55e]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#1e1e1e" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="#22c55e" strokeWidth="6"
                  strokeDasharray={`${progress * 2.01} ${201 - progress * 2.01}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[#f0f0f0] text-lg font-bold">{progress}%</span>
            </div>
            <div>
              <p className="text-[#f0f0f0] font-semibold">In Bearbeitung</p>
              <p className="text-[#888] text-xs mt-1">3 von {QUESTIONS.length} Fragen beantwortet</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-3">Beantwortet</p>
          <p className="text-[#f0f0f0] text-3xl font-bold">3</p>
          <p className="text-[#22c55e] text-xs mt-1">Fragen</p>
        </div>

        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-3">Verbleibend</p>
          <p className="text-[#f0f0f0] text-3xl font-bold">3</p>
          <p className="text-[#888] text-xs mt-1">Fragen offen</p>
        </div>
      </div>

      {/* Question list */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden mb-6">
        <div className="p-5 border-b border-[#2a2a2a]">
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Analysefragen</h2>
        </div>
        <div className="divide-y divide-[#1e1e1e]">
          {QUESTIONS.map((q) => (
            <div key={q.id} className={`flex items-start gap-4 p-4 ${q.active ? "bg-[#22c55e]/5" : ""}`}>
              <div className="flex-shrink-0 mt-0.5">
                {q.done ? (
                  <CheckCircle2 size={18} className="text-[#22c55e]" />
                ) : q.active ? (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-[#22c55e] animate-pulse" />
                ) : (
                  <Lock size={16} className="text-[#444]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[#555] text-xs font-medium mr-2">{q.category}</span>
                <p className={`text-sm mt-0.5 ${q.done ? "text-[#888]" : q.active ? "text-[#f0f0f0]" : "text-[#555]"}`}>
                  {q.text}
                </p>
              </div>
              {q.active && (
                <button className="flex-shrink-0 flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Beantworten
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#141414] border border-[#22c55e]/20 rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
            <Play size={20} className="text-[#22c55e] ml-0.5" fill="currentColor" />
          </div>
          <div>
            <p className="text-[#f0f0f0] font-semibold">Analyse fortsetzen</p>
            <p className="text-[#888] text-sm">Nächste Frage: Softwaretools & Digitalisierung</p>
          </div>
        </div>
        <button className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2">
          Weiter
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
