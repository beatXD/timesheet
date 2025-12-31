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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Project {
  _id: string;
  name: string;
  description?: string;
}

export default function ProjectsPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !project.name.toLowerCase().includes(query) &&
          !(project.description && project.description.toLowerCase().includes(query))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [projects, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
  };

  const hasActiveFilters = searchQuery !== "";

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/projects");
      const data = await res.json();
      if (data.data) setProjects(data.data);
    } catch (error) {
      toast.error(t("errors.failedToFetch"));
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditProject(null);
    setFormData({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
    });
    setIsDialogOpen(true);
  };

  const saveProject = async () => {
    if (!formData.name) {
      toast.error(t("admin.projects.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const method = editProject ? "PUT" : "POST";
      const body = editProject
        ? { _id: editProject._id, ...formData }
        : formData;

      const res = await fetch("/api/admin/projects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(editProject ? t("success.projectUpdated") : t("success.projectCreated"));
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm(t("confirm.deleteProject"))) return;

    try {
      const res = await fetch(`/api/admin/projects?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToDelete"));
        return;
      }

      toast.success(t("success.projectDeleted"));
      fetchData();
    } catch (error) {
      toast.error(t("errors.failedToDelete"));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.projects.title")}</h1>
          <p className="text-muted-foreground">{t("admin.projects.description")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t("admin.projects.addProject")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("admin.projects.allProjects")}</CardTitle>
              <CardDescription>{t("admin.projects.projectsAssigned")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.projects.searchProjects")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? t("admin.projects.noProjectsMatch")
                : t("admin.projects.noProjects")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {project.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(project)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteProject(project._id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editProject ? t("admin.projects.editProject") : t("admin.projects.addProject")}
            </DialogTitle>
            <DialogDescription>
              {editProject ? t("admin.projects.updateProject") : t("admin.projects.addNewProject")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("admin.projects.projectName")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("admin.projects.projectNamePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.projects.projectDescription")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("admin.projects.descriptionPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveProject} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
