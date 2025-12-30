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
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
  roles?: UserRole[];
}

const navSections: NavSection[] = [
  {
    titleKey: "nav.sections.main",
    items: [
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
        href: "/admin/leaves",
        labelKey: "nav.leaves",
        icon: <Briefcase className="w-5 h-5" />,
      },
    ],
  },
  {
    titleKey: "nav.sections.teamManagement",
    roles: ["admin", "leader"],
    items: [
      {
        href: "/team",
        labelKey: "nav.team",
        icon: <Users className="w-5 h-5" />,
        roles: ["admin", "leader"],
      },
    ],
  },
  {
    titleKey: "nav.sections.administration",
    roles: ["admin"],
    items: [
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
    ],
  },
];

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebarStore();
  const t = useTranslations();

  const filteredSections = navSections
    .filter((section) => !section.roles || section.roles.includes(userRole))
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || item.roles.includes(userRole)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {isOpen && (
          <Link href="/dashboard" className="font-bold text-xl text-sidebar-foreground">
            {t("common.appName")}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className={cn("text-sidebar-foreground hover:bg-sidebar-accent", !isOpen && "mx-auto")}
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 transition-transform",
              !isOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      <nav className="p-2 space-y-4">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.titleKey}>
            {isOpen && (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  {t(section.titleKey)}
                </h3>
              </div>
            )}
            {!isOpen && sectionIndex > 0 && (
              <div className="mx-3 my-2 border-t border-sidebar-border" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const label = t(item.labelKey);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      !isOpen && "justify-center"
                    )}
                    title={!isOpen ? label : undefined}
                  >
                    {item.icon}
                    {isOpen && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
