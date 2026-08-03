"use client";

import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";

const MOCK_MESSAGES = [
  { id: "1", from: "OKUN", text: "Guten Morgen! Wir haben Ihre Unterlagen erhalten und beginnen heute mit der Analyse.", time: "09:15", date: "Heute" },
  { id: "2", from: "USER", text: "Vielen Dank! Haben Sie noch Fragen zu unserer Dienstplanung?", time: "09:32", date: "Heute" },
  { id: "3", from: "OKUN", text: "Ja, könnten Sie uns mehr über die aktuelle Software mitteilen, die Sie für die Planung nutzen?", time: "09:45", date: "Heute" },
  { id: "4", from: "OKUN", text: "Außerdem wäre es hilfreich zu wissen, wie viele Mitarbeiter aktuell im System erfasst sind.", time: "09:46", date: "Heute" },
];

export default function NachrichtenPage() {
  const [message, setMessage] = useState("");

  return (
    <div className="max-w-[700px] mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Nachrichten</h1>
        <p className="text-[#888] text-sm mt-1">Direktkommunikation mit OKUN Systems</p>
      </div>

      <div className="flex-1 bg-[#0c1520] border border-[#1a2840] rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#1a2840]">
          <div className="w-9 h-9 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center">
            <span className="text-[#00b8ff] text-xs font-bold">FO</span>
          </div>
          <div>
            <p className="text-[#f0f0f0] text-sm font-medium">Felix Okun</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00b8ff]" />
              <p className="text-[#00b8ff] text-xs">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MOCK_MESSAGES.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from === "USER" ? "justify-end" : "justify-start"}`}>
              {msg.from === "OKUN" && (
                <div className="w-7 h-7 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex-shrink-0 flex items-center justify-center mr-2.5 mt-auto">
                  <span className="text-[#00b8ff] text-xs font-bold">FO</span>
                </div>
              )}
              <div className={`max-w-[80%] ${msg.from === "USER" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`px-4 py-2.5 rounded-xl text-sm ${
                  msg.from === "USER"
                    ? "bg-[#00b8ff]/15 border border-[#00b8ff]/25 text-[#f0f0f0] rounded-tr-sm"
                    : "bg-[#101c2e] border border-[#1a2840] text-[#f0f0f0] rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[#555] text-xs mt-1 px-1">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1a2840]">
          <div className="flex gap-3">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Nachricht eingeben..."
              className="flex-1 bg-[#060a10] border border-[#1a2840] rounded-xl px-4 py-3 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setMessage(""); } }}
            />
            <button
              onClick={() => setMessage("")}
              className="w-11 h-11 rounded-xl bg-[#00b8ff] hover:bg-[#0099d6] flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send size={16} className="text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
