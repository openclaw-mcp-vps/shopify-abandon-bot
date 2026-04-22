import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs font-medium text-zinc-200",
        className
      )}
    >
      {children}
    </span>
  );
}
