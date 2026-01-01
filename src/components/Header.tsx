"use client";

import { useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Globe, Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/NotificationBell";
import { useSidebarStore } from "@/store";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { locales, localeNames, type Locale } from "@/i18n/config";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    image?: string;
    role: UserRole;
  };
}

const roleColors: Record<UserRole, string> = {
  super_admin: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  user: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

export function Header({ user }: HeaderProps) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const { isOpen } = useSidebarStore();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
      window.location.reload();
    });
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-14 bg-background border-b flex items-center justify-end px-4 gap-3 transition-all duration-300",
        isOpen ? "left-64" : "left-16"
      )}
    >
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className={`${roleColors[user.role]} text-xs w-fit`}>
                  {t(`roles.${user.role}`)}
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="w-4 h-4 mr-2" />
              {t("nav.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isPending}>
              <Globe className="w-4 h-4 mr-2" />
              {t("common.language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {locales.map((l) => (
                  <DropdownMenuItem
                    key={l}
                    onClick={() => handleLocaleChange(l)}
                  >
                    {locale === l && <Check className="w-4 h-4 mr-2" />}
                    <span className={locale !== l ? "ml-6" : ""}>{localeNames[l]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="w-4 h-4 mr-2 dark:hidden" />
              <Moon className="w-4 h-4 mr-2 hidden dark:block" />
              {t("common.theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  {theme === "light" && <Check className="w-4 h-4 mr-2" />}
                  <Sun className={`w-4 h-4 mr-2 text-amber-500 ${theme !== "light" ? "ml-6" : ""}`} />
                  {t("common.themeLight")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  {theme === "dark" && <Check className="w-4 h-4 mr-2" />}
                  <Moon className={`w-4 h-4 mr-2 text-blue-400 ${theme !== "dark" ? "ml-6" : ""}`} />
                  {t("common.themeDark")}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
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
