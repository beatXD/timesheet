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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types";

interface Organization {
  admin: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: string;
    maxUsers: number;
    maxTeams: number;
  };
  stats: {
    teamCount: number;
    memberCount: number;
  };
}

export default function SubscriptionsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>("free");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editMaxUsers, setEditMaxUsers] = useState<number>(1);
  const [editMaxTeams, setEditMaxTeams] = useState<number>(1);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/super-admin/organizations");
      const data = await res.json();

      if (data.data) {
        setOrganizations(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    setEditPlan(org.subscription.plan);
    setEditStatus(org.subscription.status);
    setEditMaxUsers(org.subscription.maxUsers);
    setEditMaxTeams(org.subscription.maxTeams);
  };

  const handleSave = async () => {
    if (!editingOrg) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${editingOrg.admin._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: editPlan,
          status: editStatus,
          maxUsers: editMaxUsers,
          maxTeams: editMaxTeams,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(t("success.updated"));
      setEditingOrg(null);
      fetchOrganizations();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !org.admin.name.toLowerCase().includes(query) &&
        !org.admin.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (filterPlan !== "all" && org.subscription.plan !== filterPlan) {
      return false;
    }
    return true;
  });

  const getPlanColor = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "enterprise":
        return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";
      case "pro":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
      case "past_due":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      <div>
        <h1 className="text-2xl font-bold">{t("superAdmin.subscriptions")}</h1>
        <p className="text-muted-foreground">{t("superAdmin.subscriptionsDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("superAdmin.manageSubscriptions")}</CardTitle>
              <CardDescription>{t("superAdmin.manageSubscriptionsDescription")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("superAdmin.allPlans")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.allPlans")}</SelectItem>
                  <SelectItem value="free">{t("subscription.free")}</SelectItem>
                  <SelectItem value="pro">{t("subscription.pro")}</SelectItem>
                  <SelectItem value="enterprise">{t("subscription.enterprise")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("superAdmin.admin")}</TableHead>
                <TableHead>{t("superAdmin.plan")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("superAdmin.limits")}</TableHead>
                <TableHead>{t("superAdmin.usage")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow key={org.admin._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={org.admin.image} />
                        <AvatarFallback>{getInitials(org.admin.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{org.admin.name}</p>
                        <p className="text-xs text-muted-foreground">{org.admin.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanColor(org.subscription.plan)}>
                      {t(`subscription.${org.subscription.plan}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(org.subscription.status)}>
                      {org.subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{org.subscription.maxUsers} {t("subscription.users")}</div>
                      <div className="text-muted-foreground">{org.subscription.maxTeams} {t("subscription.teams")}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{org.stats.memberCount + 1} / {org.subscription.maxUsers}</div>
                      <div className="text-muted-foreground">{org.stats.teamCount} / {org.subscription.maxTeams}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("superAdmin.noSubscriptions")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingOrg} onOpenChange={() => setEditingOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("superAdmin.editSubscription")}</DialogTitle>
            <DialogDescription>
              {editingOrg?.admin.name} - {editingOrg?.admin.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("superAdmin.plan")}</Label>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v as SubscriptionPlan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{t("subscription.free")}</SelectItem>
                  <SelectItem value="pro">{t("subscription.pro")}</SelectItem>
                  <SelectItem value="enterprise">{t("subscription.enterprise")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("common.status")}</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("superAdmin.statusActive")}</SelectItem>
                  <SelectItem value="cancelled">{t("superAdmin.statusCancelled")}</SelectItem>
                  <SelectItem value="past_due">{t("superAdmin.statusPastDue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("subscription.maxUsers")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("subscription.maxTeams")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={editMaxTeams}
                  onChange={(e) => setEditMaxTeams(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrg(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
