import * as React from "react";
import { cn } from "@/lib/utils";

// Linear progress bar
interface LinearProgressProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
}

export function LinearProgress({
  value,
  className,
  barClassName,
  showLabel = false,
}: LinearProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-[#22c55e] transition-all duration-500", barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-[#888] w-8 text-right">{clamped}%</span>
      )}
    </div>
  );
}

// Circular / ring progress
interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: React.ReactNode;
  color?: string;
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 5,
  className,
  label,
  color = "#22c55e",
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {label !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center">
          {label}
        </div>
      )}
    </div>
  );
}
