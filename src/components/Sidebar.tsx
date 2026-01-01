"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSidebarStore, useModeStore } from "@/store";
import type { UserRole } from "@/types";
import { ModeToggle } from "@/components/ModeToggle";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LayoutDashboard, // TODO: Re-enable when dashboard is ready
  Clock,
  Building2,
  FolderKanban,
  Calendar,
  UserCog,
  ChevronLeft,
  Briefcase,
  CalendarPlus,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  UsersRound,
  FileSpreadsheet,
  Settings2,
  History,
  BarChart3,
  Users,
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
    titleKey: "nav.sections.overview",
    items: [
      // TODO: Enable when dashboard is ready
      // {
      //   href: "/dashboard",
      //   labelKey: "nav.dashboard",
      //   icon: <LayoutDashboard className="w-5 h-5" />,
      // },
      {
        href: "/admin/leaves",
        labelKey: "nav.leaves",
        icon: <Briefcase className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/timesheets/records",
        labelKey: "nav.timesheetRecords",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/reports",
        labelKey: "nav.reports",
        icon: <BarChart3 className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/audit-logs",
        labelKey: "nav.auditLogs",
        icon: <History className="w-4 h-4" />,
        roles: ["admin"],
      },
    ],
  },
  {
    titleKey: "nav.sections.myWork",
    roles: ["user", "leader"],
    items: [
      {
        href: "/calendar",
        labelKey: "nav.myCalendar",
        icon: <CalendarDays className="w-4 h-4" />,
        roles: ["user", "leader"],
      },
      {
        href: "/timesheet",
        labelKey: "nav.timesheet",
        icon: <Clock className="w-4 h-4" />,
        roles: ["user", "leader"],
      },
      {
        href: "/leave-requests",
        labelKey: "nav.leaveRequests",
        icon: <CalendarPlus className="w-4 h-4" />,
        roles: ["user", "leader"],
      },
    ],
  },
  {
    titleKey: "nav.sections.teamManagement",
    roles: ["leader"],
    items: [
      {
        href: "/team/calendar",
        labelKey: "nav.teamCalendar",
        icon: <CalendarDays className="w-4 h-4" />,
        roles: ["leader"],
      },
      {
        href: "/team",
        labelKey: "nav.teamTimesheets",
        icon: <ClipboardList className="w-4 h-4" />,
        roles: ["leader"],
      },
      {
        href: "/team/leaves",
        labelKey: "nav.teamLeaves",
        icon: <CalendarCheck className="w-4 h-4" />,
        roles: ["leader"],
      },
      {
        href: "/team/members",
        labelKey: "nav.teamMembers",
        icon: <UsersRound className="w-4 h-4" />,
        roles: ["leader"],
      },
    ],
  },
  {
    titleKey: "nav.sections.settings",
    roles: ["admin"],
    items: [
      {
        href: "/admin/users",
        labelKey: "nav.users",
        icon: <UserCog className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/teams",
        labelKey: "nav.teams",
        icon: <Users className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/vendors",
        labelKey: "nav.vendors",
        icon: <Building2 className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/projects",
        labelKey: "nav.projects",
        icon: <FolderKanban className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/holidays",
        labelKey: "nav.holidays",
        icon: <Calendar className="w-4 h-4" />,
        roles: ["admin"],
      },
      {
        href: "/admin/leave-settings",
        labelKey: "nav.leaveSettings",
        icon: <Settings2 className="w-4 h-4" />,
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
  const { mode } = useModeStore();
  const t = useTranslations();

  const filteredSections = navSections
    .filter((section) => {
      // Role-based filtering
      if (section.roles && !section.roles.includes(userRole)) return false;
      // Mode-based filtering: hide admin/team sections in personal mode
      if (mode === "personal") {
        if (section.titleKey === "nav.sections.teamManagement") return false;
        if (section.titleKey === "nav.sections.settings") return false;
        if (section.titleKey === "nav.sections.overview") return false;
      }
      return true;
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Role-based filtering
        if (item.roles && !item.roles.includes(userRole)) return false;
        // Mode-based filtering: hide leave requests in personal mode
        if (mode === "personal" && item.href === "/leave-requests") return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  // Collect all hrefs to check for more specific matches
  const allHrefs = filteredSections.flatMap((s) => s.items.map((i) => i.href));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
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
              "w-4 h-4 transition-transform",
              !isOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      <div className="border-b border-sidebar-border">
        <ModeToggle isExpanded={isOpen} />
      </div>

      <nav className="p-1.5 space-y-3">
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
                // Check if pathname matches this item
                const isExactOrNested =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                // Check if there's a more specific menu item that matches
                const hasMoreSpecificMatch = allHrefs.some(
                  (h) =>
                    h !== item.href &&
                    h.startsWith(item.href + "/") &&
                    (pathname === h || pathname.startsWith(h + "/"))
                );
                const isActive = isExactOrNested && !hasMoreSpecificMatch;
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
