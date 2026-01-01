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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Users,
  Search,
  Eye,
  Crown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types";

interface Member {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface Team {
  _id: string;
  name: string;
  memberCount: number;
  members: Member[];
}

interface Organization {
  admin: {
    _id: string;
    name: string;
    email: string;
    image?: string;
    createdAt: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: string;
    maxUsers: number;
    maxTeams: number;
  };
  teams: Team[];
  stats: {
    teamCount: number;
    memberCount: number;
  };
}

export default function OrganizationsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

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
        <h1 className="text-2xl font-bold">{t("superAdmin.organizations")}</h1>
        <p className="text-muted-foreground">{t("superAdmin.organizationsDescription")}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("superAdmin.searchOrganizations")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-40">
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

      {/* Organizations Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrgs.map((org) => (
          <Card key={org.admin._id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={org.admin.image} />
                    <AvatarFallback>{getInitials(org.admin.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{org.admin.name}</CardTitle>
                    <CardDescription className="text-xs">{org.admin.email}</CardDescription>
                  </div>
                </div>
                <Badge className={getPlanColor(org.subscription.plan)}>
                  {t(`subscription.${org.subscription.plan}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{org.stats.teamCount} {t("common.teams")}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{org.stats.memberCount} {t("superAdmin.members")}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedOrg(org)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {t("superAdmin.viewDetails")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrgs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("superAdmin.noOrganizations")}
          </CardContent>
        </Card>
      )}

      {/* Organization Details Dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedOrg?.admin.image} />
                <AvatarFallback>
                  {selectedOrg?.admin.name ? getInitials(selectedOrg.admin.name) : ""}
                </AvatarFallback>
              </Avatar>
              {selectedOrg?.admin.name}
            </DialogTitle>
            <DialogDescription>{selectedOrg?.admin.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Subscription Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">{t("superAdmin.subscriptionInfo")}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("superAdmin.plan")}:</span>{" "}
                  <Badge className={getPlanColor(selectedOrg?.subscription.plan || "free")}>
                    {t(`subscription.${selectedOrg?.subscription.plan}`)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("common.status")}:</span>{" "}
                  <Badge variant="secondary">{selectedOrg?.subscription.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("subscription.maxUsers")}:</span>{" "}
                  {selectedOrg?.subscription.maxUsers}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("subscription.maxTeams")}:</span>{" "}
                  {selectedOrg?.subscription.maxTeams}
                </div>
              </div>
            </div>

            {/* Teams */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t("common.teams")}</h4>
              {selectedOrg?.teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("superAdmin.noTeams")}</p>
              ) : (
                <div className="space-y-3">
                  {selectedOrg?.teams.map((team) => (
                    <div key={team._id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{team.name}</span>
                        <Badge variant="secondary">
                          {team.memberCount} {t("superAdmin.members")}
                        </Badge>
                      </div>
                      {team.members.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {team.members.map((member) => (
                            <div
                              key={member._id}
                              className="flex items-center gap-2 text-sm bg-muted/50 px-2 py-1 rounded"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.image} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
