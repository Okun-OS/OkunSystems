"use client";

import Image from "next/image";

// Clip height shows icon + ÖKUN + SYSTEMS, removes the tagline below the separator.
// PNG native: 1039 × 356, main logo occupies top ~76% (≈271px).
// At 200px display width: full height = 68.5px, 76% = 52px visible.
const clipHeights = { sm: 52, md: 64, lg: 84 };

export function OkunLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div
      style={{
        overflow: "hidden",
        lineHeight: 0,
        maxHeight: clipHeights[size],
      }}
    >
      <Image
        src="/okun-logo.png"
        alt="ÖKUN Systems"
        width={1039}
        height={356}
        priority
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}
