"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  maxUsers: number;
  maxTeams: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  stripePriceId?: string;
}

const defaultPlan: Omit<Plan, "_id"> = {
  slug: "",
  name: "",
  description: "",
  monthlyPrice: 0,
  maxUsers: 1,
  maxTeams: 1,
  features: [],
  isActive: true,
  sortOrder: 0,
  stripePriceId: "",
};

export default function PlansPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Plan, "_id">>(defaultPlan);
  const [featuresInput, setFeaturesInput] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/super-admin/plans");
      const data = await res.json();
      if (data.data) {
        setPlans(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData(defaultPlan);
    setFeaturesInput("");
    setIsCreating(true);
    setEditingPlan(null);
  };

  const openEditDialog = (plan: Plan) => {
    setFormData({
      slug: plan.slug,
      name: plan.name,
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice,
      maxUsers: plan.maxUsers,
      maxTeams: plan.maxTeams,
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      stripePriceId: plan.stripePriceId || "",
    });
    setFeaturesInput(plan.features.join("\n"));
    setEditingPlan(plan);
    setIsCreating(false);
  };

  const closeDialog = () => {
    setEditingPlan(null);
    setIsCreating(false);
    setFormData(defaultPlan);
    setFeaturesInput("");
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.name) {
      toast.error(t("superAdmin.plans.slugNameRequired"));
      return;
    }

    setSaving(true);
    try {
      const features = featuresInput
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const payload = { ...formData, features };

      const url = editingPlan
        ? `/api/super-admin/plans/${editingPlan._id}`
        : "/api/super-admin/plans";
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(editingPlan ? t("success.updated") : t("success.created"));
      closeDialog();
      fetchPlans();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(`/api/super-admin/plans/${deleteConfirm._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToDelete"));
        return;
      }

      toast.success(t("success.deleted"));
      setDeleteConfirm(null);
      fetchPlans();
    } catch (error) {
      toast.error(t("errors.failedToDelete"));
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("superAdmin.plans.title")}</h1>
          <p className="text-muted-foreground">
            {t("superAdmin.plans.description")}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t("superAdmin.plans.addPlan")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("superAdmin.plans.allPlans")}</CardTitle>
          <CardDescription>
            {t("superAdmin.plans.allPlansDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t("superAdmin.plans.planName")}</TableHead>
                <TableHead>{t("superAdmin.plans.slug")}</TableHead>
                <TableHead>{t("superAdmin.plans.price")}</TableHead>
                <TableHead>{t("superAdmin.plans.limits")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan._id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {plan.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    {plan.monthlyPrice === 0 ? (
                      <span className="text-green-600 font-medium">
                        {t("subscription.free")}
                      </span>
                    ) : (
                      <span>
                        {formatPrice(plan.monthlyPrice)}
                        <span className="text-xs text-muted-foreground">
                          /{t("subscription.month")}
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {plan.maxUsers} {t("subscription.users")}
                      </div>
                      <div className="text-muted-foreground">
                        {plan.maxTeams} {t("subscription.teams")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={plan.isActive ? "default" : "secondary"}
                      className={
                        plan.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : ""
                      }
                    >
                      {plan.isActive
                        ? t("superAdmin.statusActive")
                        : t("superAdmin.plans.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(plan)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {t("superAdmin.plans.noPlans")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingPlan} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPlan
                ? t("superAdmin.plans.editPlan")
                : t("superAdmin.plans.addPlan")}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? t("superAdmin.plans.editPlanDescription")
                : t("superAdmin.plans.addPlanDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("superAdmin.plans.planName")} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Pro"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("superAdmin.plans.slug")} *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="team"
                  disabled={!!editingPlan}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("common.description")}</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("superAdmin.plans.descriptionPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>{t("superAdmin.plans.monthlyPrice")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.monthlyPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyPrice: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("subscription.maxUsers")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.maxUsers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxUsers: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("subscription.maxTeams")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.maxTeams}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxTeams: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("superAdmin.plans.features")}</Label>
              <Textarea
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                placeholder={t("superAdmin.plans.featuresPlaceholder")}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {t("superAdmin.plans.featuresHelp")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("superAdmin.plans.sortOrder")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked === true })
                  }
                />
                <Label htmlFor="isActive">{t("superAdmin.plans.isActive")}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("superAdmin.plans.confirmDelete")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("superAdmin.plans.confirmDeleteDescription", {
                name: deleteConfirm?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
