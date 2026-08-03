"use client";

import Image from "next/image";

const sizes = {
  sm: { width: 138, height: 36 },
  md: { width: 192, height: 50 },
  lg: { width: 268, height: 70 },
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
      style={{ objectFit: "contain" }}
    />
  );
}
