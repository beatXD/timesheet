"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: "admin" | "leader" | "user";
}

interface Project {
  _id: string;
  name: string;
}

interface Team {
  _id: string;
  name: string;
  leaderId: User;
  memberIds: User[];
  projectId?: Project;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    leaderId: "",
    memberIds: [] as string[],
    projectId: "",
  });
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.leaderId.name.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  const fetchData = async () => {
    try {
      const [teamsRes, usersRes, projectsRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/admin/users"),
        fetch("/api/admin/projects"),
      ]);
      const teamsData = await teamsRes.json();
      const usersData = await usersRes.json();
      const projectsData = await projectsRes.json();

      if (teamsData.data) setTeams(teamsData.data);
      if (usersData.data) setUsers(usersData.data);
      if (projectsData.data) setProjects(projectsData.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditTeam(null);
    setFormData({ name: "", leaderId: "", memberIds: [], projectId: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditTeam(team);
    setFormData({
      name: team.name,
      leaderId: team.leaderId._id,
      memberIds: team.memberIds.map((m) => m._id),
      projectId: team.projectId?._id || "",
    });
    setIsDialogOpen(true);
  };

  const saveTeam = async () => {
    if (!formData.name || !formData.leaderId) {
      toast.error("Name and leader are required");
      return;
    }
    setSaving(true);
    try {
      const method = editTeam ? "PUT" : "POST";
      const body = editTeam ? { _id: editTeam._id, ...formData } : formData;

      const res = await fetch("/api/admin/teams", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return;
      }

      toast.success(editTeam ? "Team updated" : "Team created");
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save team");
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      const res = await fetch(`/api/admin/teams?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }

      toast.success("Team deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete team");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage teams and members</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Teams</CardTitle>
              <CardDescription>Teams and their members</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTeams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No teams match the search." : "No teams yet. Add your first team."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team._id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={team.leaderId.image} />
                          <AvatarFallback className="text-xs">
                            {team.leaderId.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{team.leaderId.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {team.memberIds.slice(0, 3).map((member) => (
                          <Badge key={member._id} variant="secondary">
                            {member.name.split(" ")[0]}
                          </Badge>
                        ))}
                        {team.memberIds.length > 3 && (
                          <Badge variant="secondary">
                            +{team.memberIds.length - 3}
                          </Badge>
                        )}
                        {team.memberIds.length === 0 && (
                          <span className="text-muted-foreground">No members</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{team.projectId?.name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(team)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteTeam(team._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTeam ? "Edit Team" : "Add Team"}</DialogTitle>
            <DialogDescription>
              {editTeam ? "Update team information" : "Add a new team"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Team name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Project</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, projectId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Leader *</Label>
              <Select
                value={formData.leaderId}
                onValueChange={(v) =>
                  setFormData({ ...formData, leaderId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leader" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => user.role === "leader" || user.role === "admin")
                    .map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Members</Label>
              <div className="grid grid-cols-2 gap-4 h-56">
                {/* Left column: Regular Users */}
                <div className="flex flex-col gap-2 h-full">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Users</p>
                  <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2">
                    {users
                      .filter((user) => (!user.role || user.role === "user") && user._id !== formData.leaderId)
                      .map((user) => (
                        <div key={user._id} className="flex items-center gap-2">
                          <Checkbox
                            id={`member-${user._id}`}
                            checked={formData.memberIds.includes(user._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  memberIds: [...formData.memberIds, user._id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  memberIds: formData.memberIds.filter(
                                    (id) => id !== user._id
                                  ),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`member-${user._id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {user.name}
                          </label>
                        </div>
                      ))}
                    {users.filter((user) => (!user.role || user.role === "user") && user._id !== formData.leaderId).length === 0 && (
                      <p className="text-sm text-muted-foreground">No users</p>
                    )}
                  </div>
                </div>
                {/* Right column: Leaders (can be members in other teams) */}
                <div className="flex flex-col gap-2 h-full">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leaders</p>
                  <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2">
                    {users
                      .filter((user) => (user.role === "leader" || user.role === "admin") && user._id !== formData.leaderId)
                      .map((user) => (
                        <div key={user._id} className="flex items-center gap-2">
                          <Checkbox
                            id={`member-leader-${user._id}`}
                            checked={formData.memberIds.includes(user._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  memberIds: [...formData.memberIds, user._id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  memberIds: formData.memberIds.filter(
                                    (id) => id !== user._id
                                  ),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`member-leader-${user._id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {user.name}
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {user.role}
                            </Badge>
                          </label>
                        </div>
                      ))}
                    {users.filter((user) => (user.role === "leader" || user.role === "admin") && user._id !== formData.leaderId).length === 0 && (
                      <p className="text-sm text-muted-foreground">No leaders</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTeam} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
