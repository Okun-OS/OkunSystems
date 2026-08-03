"use client";

import Image from "next/image";

// Native PNG ratio: 1039 × 356 ≈ 2.92 : 1 (transparent background, no padding)
const sizes = {
  sm: { width: 180, height: 62 },
  md: { width: 220, height: 75 },
  lg: { width: 280, height: 96 },
};

export function OkunLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { width, height } = sizes[size];
  return (
    <Image
      src="/okun-logo.png"
      alt="ÖKUN Systems"
      width={width}
      height={height}
      priority
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}
