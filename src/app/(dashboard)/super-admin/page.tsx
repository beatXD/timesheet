"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  CreditCard,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Stats {
  users: {
    total: number;
    admins: number;
    users: number;
    recentSignups: number;
  };
  teams: {
    total: number;
  };
  subscriptions: {
    free: number;
    team: number;
    enterprise: number;
  };
  timesheets: {
    total: number;
    approved: number;
    pending: number;
  };
  revenue: {
    monthly: number;
  };
  signupTrend: { date: string; count: number }[];
}

export default function SuperAdminDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/super-admin/stats");
      const data = await res.json();

      if (data.data) {
        setStats(data.data);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
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
        <h1 className="text-2xl font-bold">{t("superAdmin.dashboard")}</h1>
        <p className="text-muted-foreground">{t("superAdmin.dashboardDescription")}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("superAdmin.totalUsers")}</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.users.recentSignups || 0} {t("superAdmin.last30Days")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("superAdmin.totalTeams")}</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.teams.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.users.admins || 0} {t("superAdmin.teamAdmins")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("superAdmin.monthlyRevenue")}</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.revenue.monthly || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {(stats?.subscriptions.team || 0) + (stats?.subscriptions.enterprise || 0)} {t("superAdmin.paidSubscriptions")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("superAdmin.timesheets")}</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.timesheets.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.timesheets.pending || 0} {t("superAdmin.pendingApproval")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t("superAdmin.subscriptionDistribution")}
            </CardTitle>
            <CardDescription>{t("superAdmin.subscriptionBreakdown")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span>{t("subscription.free")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.subscriptions.free || 0}</span>
                  <Badge variant="secondary">{t("superAdmin.users")}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span>{t("subscription.team")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.subscriptions.team || 0}</span>
                  <Badge variant="secondary">{t("superAdmin.users")}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-400" />
                  <span>{t("subscription.enterprise")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.subscriptions.enterprise || 0}</span>
                  <Badge variant="secondary">{t("superAdmin.users")}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timesheet Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("superAdmin.timesheetStatus")}
            </CardTitle>
            <CardDescription>{t("superAdmin.timesheetOverview")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("status.approved")}</span>
                </div>
                <span className="font-medium">{stats?.timesheets.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>{t("status.submitted")}</span>
                </div>
                <span className="font-medium">{stats?.timesheets.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>{t("common.total")}</span>
                </div>
                <span className="font-medium">{stats?.timesheets.total || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signup Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{t("superAdmin.signupTrend")}</CardTitle>
          <CardDescription>{t("superAdmin.last7Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {stats?.signupTrend.map((day, index) => {
              const maxCount = Math.max(...(stats.signupTrend.map((d) => d.count) || [1]), 1);
              const height = (day.count / maxCount) * 100;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { weekday: "short" })}
                  </span>
                  <span className="text-xs font-medium">{day.count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
