"use client";

import { Play } from "lucide-react";

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export function WelcomeVideoPlayer({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  return (
    <video
      src={url}
      controls
      className="w-full h-full object-cover"
    />
  );
}

export function WelcomeVideoPlaceholder() {
  return (
    <div className="relative aspect-video bg-gradient-to-br from-[#101c2e] to-[#060a10] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center mx-auto mb-3">
          <Play size={20} className="text-[#00b8ff] ml-0.5" />
        </div>
        <p className="text-[#f0f0f0] font-semibold text-sm">Willkommensvideo</p>
        <p className="text-[#555] text-xs mt-1">von OKUN Systems</p>
      </div>
    </div>
  );
}
