"use client";

import { useTranslations } from "next-intl";
import { Briefcase, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModeStore } from "@/store";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  isExpanded?: boolean;
}

export function ModeToggle({ isExpanded = true }: ModeToggleProps) {
  const t = useTranslations("mode");
  const { mode, setMode } = useModeStore();

  return (
    <div className={cn("px-3 py-2", !isExpanded && "px-1.5")}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as "team" | "personal")}>
        <TabsList className={cn("w-full", !isExpanded && "flex-col h-auto gap-1 p-1")}>
          <TabsTrigger
            value="team"
            className={cn("gap-1.5", !isExpanded && "w-full px-2")}
            title={!isExpanded ? t("team") : undefined}
          >
            <Briefcase className="w-4 h-4" />
            {isExpanded && <span>{t("team")}</span>}
          </TabsTrigger>
          <TabsTrigger
            value="personal"
            className={cn("gap-1.5", !isExpanded && "w-full px-2")}
            title={!isExpanded ? t("personal") : undefined}
          >
            <User className="w-4 h-4" />
            {isExpanded && <span>{t("personal")}</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
