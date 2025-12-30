"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
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
      toast.error("Failed to fetch holidays");
    } finally {
      setLoading(false);
    }
  };

  const seedHolidays = async () => {
    if (
      !confirm(
        `This will replace all holidays for ${selectedYear} with Thai public holidays. Continue?`
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
        toast.error(data.error || "Failed to seed");
        return;
      }

      toast.success(`Imported ${data.count} holidays for ${selectedYear}`);
      fetchHolidays();
    } catch (error) {
      toast.error("Failed to seed holidays");
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
      toast.error("Date and name are required");
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
        toast.error(data.error || "Failed to save");
        return;
      }

      toast.success(editHoliday ? "Holiday updated" : "Holiday created");
      setIsDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error("Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;

    try {
      const res = await fetch(`/api/admin/holidays?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }

      toast.success("Holiday deleted");
      fetchHolidays();
    } catch (error) {
      toast.error("Failed to delete holiday");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Holidays</h1>
          <p className="text-muted-foreground">Manage public holidays</p>
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
            {seeding ? "Seeding..." : "Seed Thai Holidays"}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holidays for {selectedYear}</CardTitle>
          <CardDescription>
            Public holidays that will be auto-filled in timesheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No holidays for {selectedYear}. Add holidays or seed Thai public
              holidays.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday._id}>
                    <TableCell>
                      {format(new Date(holiday.date), "dd MMMM yyyy")}
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
              {editHoliday ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>
            <DialogDescription>
              {editHoliday
                ? "Update holiday information"
                : "Add a new public holiday"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Holiday name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveHoliday} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
