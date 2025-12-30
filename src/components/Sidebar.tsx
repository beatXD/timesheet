"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  FolderKanban,
  Calendar,
  UserCog,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/timesheet",
    labelKey: "nav.timesheet",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    href: "/team",
    labelKey: "nav.team",
    icon: <Users className="w-5 h-5" />,
    roles: ["admin", "leader"],
  },
  {
    href: "/admin/users",
    labelKey: "nav.users",
    icon: <UserCog className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/teams",
    labelKey: "nav.teams",
    icon: <Users className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/vendors",
    labelKey: "nav.vendors",
    icon: <Building2 className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/projects",
    labelKey: "nav.projects",
    icon: <FolderKanban className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/holidays",
    labelKey: "nav.holidays",
    icon: <Calendar className="w-5 h-5" />,
    roles: ["admin"],
  },
];

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebarStore();
  const t = useTranslations();

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-background border-r transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {isOpen && (
          <Link href="/dashboard" className="font-bold text-xl">
            {t("common.appName")}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className={cn(!isOpen && "mx-auto")}
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 transition-transform",
              !isOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      <nav className="p-2 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const label = t(item.labelKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                !isOpen && "justify-center"
              )}
              title={!isOpen ? label : undefined}
            >
              {item.icon}
              {isOpen && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
