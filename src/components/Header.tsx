"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { UserRole } from "@/types";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    image?: string;
    role: UserRole;
  };
}

const roleColors: Record<UserRole, string> = {
  admin: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  leader: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  user: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

export function Header({ user }: HeaderProps) {
  const t = useTranslations();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-background border-b flex items-center justify-end px-6 gap-4">
      <ThemeToggle />
      <LanguageSwitcher />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <Badge variant="secondary" className={roleColors[user.role]}>
                {user.role}
              </Badge>
            </div>
            <Avatar>
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="w-4 h-4 mr-2" />
              {t("nav.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("auth.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
