"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/types";

interface Team {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  teamIds?: { _id: string; name: string }[];
}

const roleColors: Record<UserRole, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  user: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
};

export default function UsersPage() {
  const t = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !user.name.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      // Role filter
      if (filterRole !== "all" && user.role !== filterRole) return false;
      // Team filter
      if (filterTeam !== "all") {
        if (filterTeam === "none") {
          if (user.teamIds && user.teamIds.length > 0) return false;
        } else {
          if (!user.teamIds || !user.teamIds.some(t => t._id === filterTeam)) return false;
        }
      }
      return true;
    });
  }, [users, searchQuery, filterRole, filterTeam]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRole("all");
    setFilterTeam("all");
  };

  const hasActiveFilters = searchQuery !== "" || filterRole !== "all" || filterTeam !== "all";

  const fetchUsers = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/teams"),
      ]);
      const usersData = await usersRes.json();
      const teamsData = await teamsRes.json();
      if (usersData.data) setUsers(usersData.data);
      if (teamsData.data) setTeams(teamsData.data);
    } catch (error) {
      toast.error(t("errors.failedToFetch"));
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUser),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(t("success.userUpdated"));
      setEditUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.users.title")}</h1>
        <p className="text-muted-foreground">{t("admin.users.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("admin.users.allUsers")}</CardTitle>
              <CardDescription>
                {t("admin.users.usersCreatedAuto")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.users.searchUsers")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder={t("admin.users.role")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allRoles")}</SelectItem>
                  <SelectItem value="super_admin">{t("roles.super_admin")}</SelectItem>
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                  <SelectItem value="user">{t("roles.user")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("common.team")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allTeams")}</SelectItem>
                  <SelectItem value="none">{t("common.noTeam")}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? t("admin.users.noUsersMatch")
                : t("admin.users.noUsers")}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.user")}</TableHead>
                <TableHead>{t("admin.users.role")}</TableHead>
                <TableHead>{t("admin.users.teams")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>{t(`roles.${user.role}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.teamIds && user.teamIds.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {user.teamIds.map((team) => (
                          <Badge key={team._id} variant="secondary">
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditUser(user)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.editUser")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.updateRoleAssignments")}
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("admin.users.role")}</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(v) =>
                    setEditUser({ ...editUser, role: v as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("roles.user")}</SelectItem>
                    <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                    <SelectItem value="super_admin">{t("roles.super_admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
