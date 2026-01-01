"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { UserPlus, X, Search, ChevronRight, Users, Link2, Copy, Trash2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Invite {
  _id: string;
  token: string;
  teamId: string;
  teamName: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  isExpired: boolean;
}

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
  adminId?: User;
  projectId?: { _id: string; name: string };
}

interface MemberWithTeam extends User {
  teamId: string;
  teamName: string;
  isLeader?: boolean;
}

export default function TeamMembersPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check if user is admin (team admin, not super_admin)
  const isSuperAdmin = session?.user?.role === "super_admin";
  const isTeamAdmin = session?.user?.role === "admin";
  const canEdit = isTeamAdmin; // Team admins can edit

  // Filter states
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Invite dialog state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Super admin uses different endpoint to get all teams
      const endpoint = isSuperAdmin ? "/api/admin/teams" : "/api/team/members";
      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.data) {
        if (isSuperAdmin) {
          // Super admin endpoint returns teams directly
          setTeams(data.data);
          setAvailableUsers([]);
        } else {
          setTeams(data.data.teams);
          setAvailableUsers(data.data.availableUsers);
        }
      }

      // Fetch invites for team admins
      if (isTeamAdmin) {
        const invitesRes = await fetch("/api/invites");
        const invitesData = await invitesRes.json();
        if (invitesData.data) {
          setInvites(invitesData.data);
        }
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, isSuperAdmin, isTeamAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flatten members with team info (including leader)
  const allMembers = useMemo(() => {
    const members: MemberWithTeam[] = [];
    teams.forEach((team) => {
      // Add leader first
      if (team.adminId) {
        members.push({
          ...team.adminId,
          teamId: team._id,
          teamName: team.name,
          isLeader: true,
        });
      }
      // Add team members
      team.memberIds.forEach((member) => {
        members.push({
          ...member,
          teamId: team._id,
          teamName: team.name,
          isLeader: false,
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

  const generateInvite = async (teamId: string) => {
    setGeneratingInvite(true);
    setNewInviteUrl(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("invite.failedToGenerate"));
        return;
      }

      setNewInviteUrl(data.data.inviteUrl);
      setIsInviteDialogOpen(true);
      fetchData(); // Refresh invites list
    } catch (error) {
      toast.error(t("invite.failedToGenerate"));
    } finally {
      setGeneratingInvite(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    if (!confirm(t("invite.confirmDelete"))) return;

    try {
      const res = await fetch(`/api/invites?id=${inviteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error(t("invite.failedToDelete"));
        return;
      }

      toast.success(t("invite.deleted"));
      fetchData();
    } catch (error) {
      toast.error(t("invite.failedToDelete"));
    }
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("invite.linkCopied"));
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
      <div className="space-y-4">
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

  // For super admin: show team list view when no team is selected
  if (isSuperAdmin && filterTeam === "all") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("teamMembers.allTeams")}</h1>
            <p className="text-muted-foreground">{t("teamMembers.viewTeamsDescription")}</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {teams.length} {t("common.teams")}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team._id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setFilterTeam(team._id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    {team.name}
                  </CardTitle>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team.adminId && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={team.adminId.image} />
                        <AvatarFallback className="text-xs">
                          {team.adminId.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{team.adminId.name}</span>
                      <Badge variant="secondary" className="text-xs">{t("roles.admin")}</Badge>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {team.memberIds.length} {t("teamMembers.members")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("teamMembers.title")}</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin ? t("teamMembers.viewDescription") : t("teamMembers.description")}
          </p>
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
              <CardDescription>
                {isSuperAdmin ? t("teamMembers.viewOnly") : t("teamMembers.manageMembers")}
              </CardDescription>
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
              {canEdit && filterTeam !== "all" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const team = teams.find((t) => t._id === filterTeam);
                      if (team) generateInvite(team._id);
                    }}
                    disabled={generatingInvite}
                    className="gap-2"
                  >
                    {generatingInvite ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    {t("invite.generateLink")}
                  </Button>
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
                </>
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
                {canEdit && <TableHead className="text-right">{t("common.actions")}</TableHead>}
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        {member.isLeader && (
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            {t("roles.admin")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.teamName}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {!member.isLeader && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember(member.teamId, member._id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 4 : 3} className="text-center py-8 text-muted-foreground">
                    {t("teamMembers.noMembers")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Invites Section */}
      {canEdit && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {t("invite.activeInvites")}
            </CardTitle>
            <CardDescription>{t("invite.activeInvitesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.filter(inv => !inv.isExpired && inv.usedCount < inv.maxUses).map((invite) => {
                const expiresAt = new Date(invite.expiresAt);
                const hoursLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
                const minutesLeft = Math.max(0, Math.floor(((expiresAt.getTime() - Date.now()) % (1000 * 60 * 60)) / (1000 * 60)));

                return (
                  <div
                    key={invite._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invite.teamName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{hoursLeft}h {minutesLeft}m {t("invite.remaining")}</span>
                          <span>•</span>
                          <span>{invite.usedCount}/{invite.maxUses} {t("invite.used")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(invite.token)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteInvite(invite._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {invites.filter(inv => !inv.isExpired && inv.usedCount < inv.maxUses).length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {t("invite.noActiveInvites")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Invite Link Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {t("invite.inviteLinkGenerated")}
            </DialogTitle>
            <DialogDescription>
              {t("invite.shareLinkDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                type="text"
                readOnly
                value={newInviteUrl || ""}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (newInviteUrl) {
                    await navigator.clipboard.writeText(newInviteUrl);
                    toast.success(t("invite.linkCopied"));
                  }
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                {t("common.copy")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t("invite.linkExpires")}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInviteDialogOpen(false)}>
              {t("common.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
