"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LeaveSettings {
  defaultQuotas: {
    sick: number;
    personal: number;
    annual: number;
  };
  resetMonth: number;
}

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function LeaveSettingsPage() {
  const t = useTranslations();
  const tMonths = useTranslations("months");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LeaveSettings>({
    defaultQuotas: {
      sick: 30,
      personal: 3,
      annual: 6,
    },
    resetMonth: 1,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/leave-settings");
      if (res.ok) {
        const { data } = await res.json();
        setSettings({
          defaultQuotas: data.defaultQuotas,
          resetMonth: data.resetMonth,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/leave-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success(t("admin.leaveSettings.settingsSaved"));
      } else {
        toast.error(t("errors.failedToSave"));
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const monthLabels: Record<string, string> = {
    "1": tMonths("january"),
    "2": tMonths("february"),
    "3": tMonths("march"),
    "4": tMonths("april"),
    "5": tMonths("may"),
    "6": tMonths("june"),
    "7": tMonths("july"),
    "8": tMonths("august"),
    "9": tMonths("september"),
    "10": tMonths("october"),
    "11": tMonths("november"),
    "12": tMonths("december"),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          {t("admin.leaveSettings.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.leaveSettings.description")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.leaveSettings.defaultQuotas")}</CardTitle>
            <CardDescription>
              {t("admin.leaveSettings.defaultQuotasDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sick">{t("admin.leaveSettings.sickLeave")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sick"
                  type="number"
                  min="0"
                  value={settings.defaultQuotas.sick}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultQuotas: {
                        ...settings.defaultQuotas,
                        sick: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {t("admin.leaveSettings.daysPerYear")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personal">{t("admin.leaveSettings.personalLeave")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="personal"
                  type="number"
                  min="0"
                  value={settings.defaultQuotas.personal}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultQuotas: {
                        ...settings.defaultQuotas,
                        personal: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {t("admin.leaveSettings.daysPerYear")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="annual">{t("admin.leaveSettings.annualLeave")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="annual"
                  type="number"
                  min="0"
                  value={settings.defaultQuotas.annual}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultQuotas: {
                        ...settings.defaultQuotas,
                        annual: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {t("admin.leaveSettings.daysPerYear")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.leaveSettings.resetMonth")}</CardTitle>
            <CardDescription>
              {t("admin.leaveSettings.resetMonthDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={String(settings.resetMonth)}
              onValueChange={(value) =>
                setSettings({ ...settings, resetMonth: parseInt(value) })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {monthLabels[month.value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("admin.leaveSettings.saveSettings")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
