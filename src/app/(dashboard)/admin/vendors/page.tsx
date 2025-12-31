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
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Vendor {
  _id: string;
  name: string;
  contractNo?: string;
}

export default function VendorsPage() {
  const t = useTranslations();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({ name: "", contractNo: "" });
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    const query = searchQuery.toLowerCase();
    return vendors.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(query) ||
        (vendor.contractNo && vendor.contractNo.toLowerCase().includes(query))
    );
  }, [vendors, searchQuery]);

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/admin/vendors");
      const data = await res.json();
      if (data.data) {
        setVendors(data.data);
      }
    } catch (error) {
      toast.error(t("errors.failedToFetch"));
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditVendor(null);
    setFormData({ name: "", contractNo: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditVendor(vendor);
    setFormData({ name: vendor.name, contractNo: vendor.contractNo || "" });
    setIsDialogOpen(true);
  };

  const saveVendor = async () => {
    if (!formData.name) {
      toast.error(t("admin.vendors.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const method = editVendor ? "PUT" : "POST";
      const body = editVendor
        ? { _id: editVendor._id, ...formData }
        : formData;

      const res = await fetch("/api/admin/vendors", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToSave"));
        return;
      }

      toast.success(editVendor ? t("success.vendorUpdated") : t("success.vendorCreated"));
      setIsDialogOpen(false);
      fetchVendors();
    } catch (error) {
      toast.error(t("errors.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const deleteVendor = async (id: string) => {
    if (!confirm(t("confirm.deleteVendor"))) return;

    try {
      const res = await fetch(`/api/admin/vendors?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("errors.failedToDelete"));
        return;
      }

      toast.success(t("success.vendorDeleted"));
      fetchVendors();
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
          <h1 className="text-2xl font-bold">{t("admin.vendors.title")}</h1>
          <p className="text-muted-foreground">{t("admin.vendors.description")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t("admin.vendors.addVendor")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("admin.vendors.allVendors")}</CardTitle>
              <CardDescription>{t("admin.vendors.vendorCompanies")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.vendors.searchVendors")}
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
          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? t("admin.vendors.noVendorsMatch") : t("admin.vendors.noVendors")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("admin.vendors.contractNo")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor._id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contractNo || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(vendor)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteVendor(vendor._id)}
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
              {editVendor ? t("admin.vendors.editVendor") : t("admin.vendors.addVendor")}
            </DialogTitle>
            <DialogDescription>
              {editVendor
                ? t("admin.vendors.updateVendor")
                : t("admin.vendors.addNewVendor")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("admin.vendors.vendorName")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("admin.vendors.companyName")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.vendors.contractNo")}</Label>
              <Input
                value={formData.contractNo}
                onChange={(e) =>
                  setFormData({ ...formData, contractNo: e.target.value })
                }
                placeholder={t("admin.vendors.contractNoPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveVendor} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
