"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Search } from "lucide-react";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: User[];
  projectId?: { _id: string; name: string };
}

interface MemberWithTeam extends User {
  teamId: string;
  teamName: string;
}

export default function TeamMembersPage() {
  const t = useTranslations();
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/members");
      const data = await res.json();

      if (data.data) {
        setTeams(data.data.teams);
        setAvailableUsers(data.data.availableUsers);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flatten members with team info
  const allMembers = useMemo(() => {
    const members: MemberWithTeam[] = [];
    teams.forEach((team) => {
      team.memberIds.forEach((member) => {
        members.push({
          ...member,
          teamId: team._id,
          teamName: team.name,
        });
      });
    });
    return members;
  }, [teams]);

  // Filter members
  const filteredMembers = useMemo(() => {
    return allMembers.filter((member) => {
      if (filterTeam !== "all" && member.teamId !== filterTeam) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !member.name.toLowerCase().includes(query) &&
          !member.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allMembers, filterTeam, searchQuery]);

  const openAddDialog = (team: Team) => {
    setSelectedTeam(team);
    setSelectedMemberIds(team.memberIds.map((m) => m._id));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTeam) return;

    setSaving(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam._id,
          memberIds: selectedMemberIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(t("success.updated"));
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (teamId: string, userId: string) => {
    if (!confirm(t("teamMembers.confirmRemove"))) return;

    const team = teams.find((t) => t._id === teamId);
    if (!team) return;

    try {
      const newMemberIds = team.memberIds
        .filter((m) => m._id !== userId)
        .map((m) => m._id);

      const res = await fetch("/api/team/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team._id,
          memberIds: newMemberIds,
        }),
      });

      if (!res.ok) {
        toast.error(t("errors.failedToSave"));
        return;
      }

      toast.success(t("teamMembers.memberRemoved"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    }
  };

  // Combine current team members and available users for the dialog
  const getAllUsersForSelection = () => {
    if (!selectedTeam) return [];

    const currentMembers = selectedTeam.memberIds;
    const combined = [...currentMembers, ...availableUsers];

    // Remove duplicates and sort
    const unique = combined.filter(
      (user, index, self) => index === self.findIndex((u) => u._id === user._id)
    );

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("teamMembers.title")}</h1>
          <p className="text-muted-foreground">{t("teamMembers.description")}</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {t("team.noTeams")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("teamMembers.title")}</h1>
          <p className="text-muted-foreground">{t("teamMembers.description")}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {allMembers.length} {t("teamMembers.members")}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("teamMembers.allMembers")}</CardTitle>
              <CardDescription>{t("teamMembers.manageMembers")}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-40"
                />
              </div>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("common.team")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allTeams")}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterTeam !== "all" && (
                <Button
                  onClick={() => {
                    const team = teams.find((t) => t._id === filterTeam);
                    if (team) openAddDialog(team);
                  }}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {t("teamMembers.addMembers")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("teamMembers.member")}</TableHead>
                <TableHead>{t("common.team")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={`${member.teamId}-${member._id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{member.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.teamName}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(member.teamId, member._id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t("teamMembers.noMembers")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Members Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("teamMembers.editMembers")}</DialogTitle>
            <DialogDescription>
              {selectedTeam?.name} - {t("teamMembers.selectMembers")}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 py-4">
            {getAllUsersForSelection().map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
              >
                <Checkbox
                  id={`user-${user._id}`}
                  checked={selectedMemberIds.includes(user._id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedMemberIds([...selectedMemberIds, user._id]);
                    } else {
                      setSelectedMemberIds(
                        selectedMemberIds.filter((id) => id !== user._id)
                      );
                    }
                  }}
                />
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
                <label
                  htmlFor={`user-${user._id}`}
                  className="flex-1 cursor-pointer"
                >
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </label>
              </div>
            ))}
            {getAllUsersForSelection().length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                {t("teamMembers.noUsersAvailable")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
