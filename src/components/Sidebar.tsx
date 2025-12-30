"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/timesheet",
    label: "Timesheet",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    href: "/team",
    label: "Team",
    icon: <Users className="w-5 h-5" />,
    roles: ["admin", "leader"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: <UserCog className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/teams",
    label: "Teams",
    icon: <Users className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/vendors",
    label: "Vendors",
    icon: <Building2 className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/projects",
    label: "Projects",
    icon: <FolderKanban className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    href: "/admin/holidays",
    label: "Holidays",
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

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {isOpen && (
          <Link href="/dashboard" className="font-bold text-xl">
            Timesheet
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                !isOpen && "justify-center"
              )}
              title={!isOpen ? item.label : undefined}
            >
              {item.icon}
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
