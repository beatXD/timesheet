"use client";

import { useEffect, useState, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, X } from "lucide-react";
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

export default function TeamMembersPage() {
  const t = useTranslations();
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const openEditDialog = (team: Team) => {
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

  const removeMember = async (team: Team, userId: string) => {
    if (!confirm(t("teamMembers.confirmRemove"))) return;

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
      <div>
        <h1 className="text-2xl font-bold">{t("teamMembers.title")}</h1>
        <p className="text-muted-foreground">{t("teamMembers.description")}</p>
      </div>

      <div className="grid gap-6">
        {teams.map((team) => (
          <Card key={team._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {team.name}
                  </CardTitle>
                  <CardDescription>
                    {team.projectId?.name && `${team.projectId.name} • `}
                    {team.memberIds.length} {t("teamMembers.members")}
                  </CardDescription>
                </div>
                <Button onClick={() => openEditDialog(team)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t("teamMembers.addMembers")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {team.memberIds.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("teamMembers.noMembers")}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {team.memberIds.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
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
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(team, member._id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
