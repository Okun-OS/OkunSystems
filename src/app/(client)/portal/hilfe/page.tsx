import { Mail, Phone, BookOpen, FileText, Layers, LifeBuoy } from "lucide-react";

const FAQ = [
  {
    q: "Wie starte ich ein Lernkapitel?",
    a: "Gehen Sie zu «Lernbereich» in der Navigation. Dort sehen Sie alle freigeschalteten Kapitel. Klicken Sie auf eine Lektion, um sie zu öffnen.",
  },
  {
    q: "Wie kann ich ein Dokument herunterladen?",
    a: "Im Bereich «Dokumente» sehen Sie alle für Sie freigegebenen Dateien. Klicken Sie auf «Herunterladen», um das Dokument zu öffnen.",
  },
  {
    q: "Warum sehe ich noch keine Lerninhalte?",
    a: "Lerninhalte werden von OKUN Systems individuell für Sie freigeschaltet. Sobald Ihr Berater Inhalte aktiviert hat, erscheinen sie automatisch in Ihrem Lernbereich.",
  },
  {
    q: "Ich habe mein Passwort vergessen.",
    a: "Gehen Sie zur Login-Seite und klicken Sie auf «Passwort vergessen». Sie erhalten dann einen Link per E-Mail, mit dem Sie ein neues Passwort vergeben können.",
  },
  {
    q: "Kann ich mehrere Nutzer für mein Unternehmen anlegen?",
    a: "Ja. Sprechen Sie Ihren Berater bei OKUN Systems an — er kann weitere Nutzer für Ihr Unternehmen einladen.",
  },
  {
    q: "Was ist der Blueprint-Bericht?",
    a: "Der OKUN Blueprint™ ist eine strukturierte Analyse Ihrer Unternehmensabläufe. Sobald Ihr Berater den Bericht für Sie freigegeben hat, können Sie ihn unter «Blueprint-Bericht» einsehen.",
  },
];

export default function HilfePage() {
  return (
    <div className="max-w-[720px] mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#f0f0f0]">Hilfe & Support</h1>
        <p className="text-[#888] text-sm mt-1">Antworten auf häufige Fragen und Kontaktmöglichkeiten.</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: "Lernbereich", href: "/portal/lernen" },
          { icon: FileText, label: "Dokumente", href: "/portal/dokumente" },
          { icon: Layers, label: "Projektstatus", href: "/portal/projekt" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 hover:border-[#22c55e]/30 transition-colors"
          >
            <item.icon size={16} className="text-[#22c55e] flex-shrink-0" />
            <span className="text-[#f0f0f0] text-sm">{item.label}</span>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-[#f0f0f0] font-semibold text-sm">Häufige Fragen</h2>
        {FAQ.map((item, i) => (
          <div key={i} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <p className="text-[#f0f0f0] text-sm font-medium mb-2">{item.q}</p>
            <p className="text-[#888] text-sm leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy size={15} className="text-[#22c55e]" />
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Direkter Kontakt</h2>
        </div>
        <p className="text-[#888] text-sm mb-4 leading-relaxed">
          Finden Sie keine Antwort auf Ihre Frage? Wir helfen Ihnen gerne direkt weiter.
        </p>
        <div className="space-y-3">
          <a
            href="mailto:support@okun-systems.de"
            className="flex items-center gap-3 text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
          >
            <Mail size={14} className="text-[#555] flex-shrink-0" />
            support@okun-systems.de
          </a>
          <div className="flex items-center gap-3 text-sm text-[#888]">
            <Phone size={14} className="text-[#555] flex-shrink-0" />
            Über Ihren persönlichen Berater
          </div>
        </div>
      </div>
    </div>
  );
}
