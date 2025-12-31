"use client";

import { useSidebarStore } from "@/store";
import { cn } from "@/lib/utils";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { isOpen } = useSidebarStore();

  return (
    <div
      className={cn(
        "transition-all duration-300 bg-background",
        isOpen ? "ml-64" : "ml-16"
      )}
    >
      {children}
    </div>
  );
}
