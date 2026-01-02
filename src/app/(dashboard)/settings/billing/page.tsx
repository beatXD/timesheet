"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  CreditCard,
  Check,
  Users,
  Building2,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types";

interface Subscription {
  plan: SubscriptionPlan;
  status: "active" | "cancelled" | "past_due";
  maxUsers: number;
  maxTeams: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: string;
}

interface PlanPricing {
  monthly: number;
  name: string;
}

interface PlanLimits {
  maxUsers: number;
  maxTeams: number;
}

export default function BillingPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [planPricing, setPlanPricing] = useState<Record<SubscriptionPlan, PlanPricing>>({
    free: { monthly: 0, name: "Free" },
    team: { monthly: 990, name: "Team" },
    enterprise: { monthly: 4990, name: "Enterprise" },
  });
  const [planLimits, setPlanLimits] = useState<Record<SubscriptionPlan, PlanLimits>>({
    free: { maxUsers: 1, maxTeams: 1 },
    team: { maxUsers: 5, maxTeams: 1 },
    enterprise: { maxUsers: 100, maxTeams: 10 },
  });
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [processing, setProcessing] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/subscriptions");
      const data = await res.json();

      if (data.data) {
        setSubscription(data.data.subscription);
        setPaymentHistory(data.data.paymentHistory || []);
        if (data.data.planPricing) setPlanPricing(data.data.planPricing);
        if (data.data.planLimits) setPlanLimits(data.data.planLimits);
      }
    } catch (error) {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handlePlanAction = async (action: string, plan?: SubscriptionPlan) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.generic"));
        return;
      }

      if (data.checkoutUrl) {
        // Redirect to checkout (mock)
        window.location.href = data.checkoutUrl;
        return;
      }

      toast.success(t("success.updated"));
      setIsUpgradeDialogOpen(false);
      fetchSubscription();
    } catch (error) {
      toast.error(t("errors.generic"));
    } finally {
      setProcessing(false);
    }
  };

  const openUpgradeDialog = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsUpgradeDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "enterprise":
        return <Building2 className="w-5 h-5" />;
      case "team":
        return <Crown className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "enterprise":
        return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";
      case "team":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
    }
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
        <h1 className="text-2xl font-bold">{t("subscription.billing")}</h1>
        <p className="text-muted-foreground">{t("subscription.managePlan")}</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("subscription.currentPlan")}</CardTitle>
              <CardDescription>
                {subscription?.status === "cancelled"
                  ? t("subscription.cancelledDescription")
                  : t("subscription.activeDescription")}
              </CardDescription>
            </div>
            <Badge className={getPlanColor(subscription?.plan || "free")}>
              {getPlanIcon(subscription?.plan || "free")}
              <span className="ml-1">{planPricing[subscription?.plan || "free"].name}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t("subscription.monthlyPrice")}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(planPricing[subscription?.plan || "free"].monthly)}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t("subscription.maxUsers")}</p>
              <p className="text-2xl font-bold">{subscription?.maxUsers || 1}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t("subscription.maxTeams")}</p>
              <p className="text-2xl font-bold">{subscription?.maxTeams || 1}</p>
            </div>
          </div>

          {subscription?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground mt-4">
              {subscription.status === "cancelled"
                ? t("subscription.endsOn", { date: formatDate(subscription.currentPeriodEnd) })
                : t("subscription.renewsOn", { date: formatDate(subscription.currentPeriodEnd) })}
            </p>
          )}
        </CardContent>
        {isAdmin && (
          <CardFooter className="gap-2">
            {subscription?.status === "cancelled" ? (
              <Button onClick={() => handlePlanAction("reactivate")} disabled={processing}>
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("subscription.reactivate")}
              </Button>
            ) : (
              <>
                {subscription?.plan !== "enterprise" && (
                  <Button onClick={() => openUpgradeDialog("enterprise")}>
                    {t("subscription.upgrade")}
                  </Button>
                )}
                {subscription?.plan !== "team" && subscription?.plan !== "free" && (
                  <Button variant="outline" onClick={() => openUpgradeDialog("team")}>
                    {t("subscription.downgrade")}
                  </Button>
                )}
                {subscription?.plan !== "free" && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handlePlanAction("cancel")}
                    disabled={processing}
                  >
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("subscription.cancel")}
                  </Button>
                )}
              </>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Available Plans */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{t("subscription.availablePlans")}</CardTitle>
            <CardDescription>{t("subscription.choosePlan")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {(["free", "team", "enterprise"] as SubscriptionPlan[]).map((plan) => (
                <div
                  key={plan}
                  className={`p-6 rounded-lg border-2 ${
                    subscription?.plan === plan
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    {getPlanIcon(plan)}
                    <h3 className="font-semibold text-lg">{planPricing[plan].name}</h3>
                    {subscription?.plan === plan && (
                      <Badge variant="secondary">{t("subscription.current")}</Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold mb-4">
                    {formatCurrency(planPricing[plan].monthly)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{t("subscription.month")}
                    </span>
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {planLimits[plan].maxUsers} {t("subscription.users")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {planLimits[plan].maxTeams} {t("subscription.teams")}
                    </li>
                    {plan !== "free" && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        {t("subscription.timesheetApproval")}
                      </li>
                    )}
                    {plan === "enterprise" && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        {t("subscription.prioritySupport")}
                      </li>
                    )}
                  </ul>
                  {subscription?.plan !== plan && (
                    <Button
                      className="w-full"
                      variant={plan === "enterprise" ? "default" : "outline"}
                      onClick={() => openUpgradeDialog(plan)}
                    >
                      {t("subscription.selectPlan")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("subscription.paymentHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("subscription.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.created)}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upgrade/Change Plan Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPlan && planPricing[selectedPlan].monthly > (planPricing[subscription?.plan || "free"].monthly)
                ? t("subscription.confirmUpgrade")
                : t("subscription.confirmChange")}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan && (
                <>
                  {t("subscription.changingTo", { plan: planPricing[selectedPlan].name })}
                  <br />
                  {t("subscription.newPrice", { price: formatCurrency(planPricing[selectedPlan].monthly) })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPlan === "free" && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                {t("subscription.downgradeWarning")}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => selectedPlan && handlePlanAction("change", selectedPlan)}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
