"use client";

import { Trash2 } from "lucide-react";

export function DeleteDocumentButton() {
  return (
    <button
      type="submit"
      className="w-7 h-7 rounded-md flex items-center justify-center text-[#555] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
      onClick={(e) => {
        if (!confirm("Dokument wirklich löschen?")) e.preventDefault();
      }}
    >
      <Trash2 size={13} />
    </button>
  );
}
