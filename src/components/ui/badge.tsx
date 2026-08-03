import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "bg-green-950/60 text-green-400 border border-green-900/50",
        warning: "bg-yellow-950/60 text-yellow-400 border border-yellow-900/50",
        error: "bg-red-950/60 text-red-400 border border-red-900/50",
        info: "bg-blue-950/60 text-blue-400 border border-blue-900/50",
        neutral: "bg-[#101c2e] text-[#888] border border-[#1a2840]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
