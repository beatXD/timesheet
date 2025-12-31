"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
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
import { Plus, Edit, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface Holiday {
  _id: string;
  date: string;
  name: string;
  year: number;
}

export default function HolidaysPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "th" ? th : enUS;

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({ date: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/holidays?year=${selectedYear}`);
      const data = await res.json();
      if (data.data) {
        setHolidays(data.data);
      }
    } catch (error) {
      toast.error(t("errors.failedToFetch"));
    } finally {
      setLoading(false);
    }
  };

  const seedHolidays = async () => {
    if (
      !confirm(
        t("admin.holidays.seedConfirm", { year: selectedYear })
      )
    )
      return;

    setSeeding(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true, year: parseInt(selectedYear) }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(t("admin.holidays.importedHolidays", { count: data.count, year: selectedYear }));
      fetchHolidays();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSeeding(false);
    }
  };

  const openCreateDialog = () => {
    setEditHoliday(null);
    setFormData({ date: "", name: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditHoliday(holiday);
    setFormData({
      date: format(new Date(holiday.date), "yyyy-MM-dd"),
      name: holiday.name,
    });
    setIsDialogOpen(true);
  };

  const saveHoliday = async () => {
    if (!formData.date || !formData.name) {
      toast.error(t("admin.holidays.dateNameRequired"));
      return;
    }
    setSaving(true);
    try {
      const method = editHoliday ? "PUT" : "POST";
      const body = editHoliday
        ? { _id: editHoliday._id, ...formData }
        : formData;

      const res = await fetch("/api/admin/holidays", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(editHoliday ? t("success.holidayUpdated") : t("success.holidayCreated"));
      setIsDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    if (!confirm(t("confirm.deleteHoliday"))) return;

    try {
      const res = await fetch(`/api/admin/holidays?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToDelete"));
        return;
      }

      toast.success(t("success.holidayDeleted"));
      fetchHolidays();
    } catch (error) {
      toast.error(t("errors.failedToDelete"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.holidays.title")}</h1>
          <p className="text-muted-foreground">{t("admin.holidays.description")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={seedHolidays} disabled={seeding}>
            <Wand2 className="w-4 h-4 mr-2" />
            {seeding ? t("common.seeding") : t("admin.holidays.seedThaiHolidays")}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.holidays.addHoliday")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.holidays.holidaysForYear", { year: selectedYear })}</CardTitle>
          <CardDescription>
            {t("admin.holidays.publicHolidaysDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.holidays.noHolidays", { year: selectedYear })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday._id}>
                    <TableCell>
                      {format(new Date(holiday.date), "dd MMMM yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(holiday)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteHoliday(holiday._id)}
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
              {editHoliday ? t("admin.holidays.editHoliday") : t("admin.holidays.addHoliday")}
            </DialogTitle>
            <DialogDescription>
              {editHoliday
                ? t("admin.holidays.updateHoliday")
                : t("admin.holidays.addNewHoliday")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("common.date")} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("common.name")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("admin.holidays.holidayName")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveHoliday} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
