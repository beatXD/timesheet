"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, Lock, Globe } from "lucide-react";
import type { IGitHubRepository } from "@/types";

interface RepoManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepoManager({ open, onOpenChange }: RepoManagerProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repos, setRepos] = useState<IGitHubRepository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch repos from GitHub and current settings in parallel
      const [reposRes, settingsRes] = await Promise.all([
        fetch("/api/github/repos"),
        fetch("/api/github/settings"),
      ]);

      const reposData = await reposRes.json();
      const settingsData = await settingsRes.json();

      if (!reposRes.ok) {
        toast.error(reposData.error || t("github.failedToFetchRepos"));
        return;
      }

      setRepos(reposData.data || []);

      // Set selected repos from settings
      if (settingsData.data?.repositories) {
        const enabledRepos = new Set<string>(
          settingsData.data.repositories
            .filter((r: IGitHubRepository) => r.enabled)
            .map((r: IGitHubRepository) => r.fullName)
        );
        setSelectedRepos(enabledRepos);
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRepo = (fullName: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const repositories = repos
        .filter((repo) => selectedRepos.has(repo.fullName))
        .map((repo) => ({
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
          enabled: true,
        }));

      const res = await fetch("/api/github/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositories }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("github.failedToSaveSettings"));
        return;
      }

      toast.success(t("github.settingsSaved"));
      onOpenChange(false);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  const filteredRepos = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("github.manageRepos")}</DialogTitle>
          <DialogDescription>
            {t("github.selectReposDesc")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("github.searchRepos")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredRepos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("github.noReposFound")}
                  </p>
                ) : (
                  filteredRepos.map((repo) => (
                    <div
                      key={repo.fullName}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleRepo(repo.fullName)}
                    >
                      <Checkbox
                        checked={selectedRepos.has(repo.fullName)}
                        onCheckedChange={() => handleToggleRepo(repo.fullName)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{repo.name}</p>
                          {repo.isPrivate ? (
                            <Badge variant="secondary" className="shrink-0">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">
                              <Globe className="w-3 h-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {repo.fullName}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">
                  {t("github.selectedRepos", { count: selectedRepos.size })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
