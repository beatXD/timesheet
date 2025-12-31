"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, User, Key, Link2, Unlink, GitBranch, Settings2 } from "lucide-react";
import { RepoManager } from "@/components/github";
import type { IGitHubStatus } from "@/types";

interface LinkedAccount {
  provider: string;
  providerAccountId: string;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  hasPassword: boolean;
  linkedAccounts: LinkedAccount[];
}

export default function ProfilePage() {
  const t = useTranslations();
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // GitHub integration state
  const [githubStatus, setGithubStatus] = useState<IGitHubStatus | null>(null);
  const [repoManagerOpen, setRepoManagerOpen] = useState(false);
  const [upgradingGitHub, setUpgradingGitHub] = useState(false);

  // Check for OAuth error in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const provider = urlParams.get("provider");
    if (error === "OAuthAccountAlreadyLinked") {
      const providerName = provider === "github" ? "GitHub" : provider === "google" ? "Google" : provider || "";
      setTimeout(() => {
        toast.error(t("errors.oauthAccountAlreadyLinked", { provider: providerName }), {
          duration: 8000,
        });
      }, 100);
      window.history.replaceState({}, "", "/profile");
    }
  }, [t]);

  useEffect(() => {
    fetchProfile();
    fetchGitHubStatus();
  }, []);

  const fetchGitHubStatus = async () => {
    try {
      const res = await fetch("/api/github/status");
      const data = await res.json();
      if (res.ok) {
        setGithubStatus(data.data);
      }
    } catch {
      // Silently fail - GitHub integration is optional
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) {
        setProfile(data.data);
        setName(data.data.name);
      }
    } catch {
      toast.error(t("errors.failedToFetch"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: Record<string, string> = {};

      if (name !== profile?.name) {
        updateData.name = name;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error(t("profile.passwordsDoNotMatch"));
          setSaving(false);
          return;
        }
        if (profile?.hasPassword && !currentPassword) {
          toast.error(t("profile.pleaseEnterCurrentPassword"));
          setSaving(false);
          return;
        }
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info(t("profile.nothingToUpdate"));
        setSaving(false);
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(data.message);

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update session if name changed
      if (updateData.name) {
        await update({ name: updateData.name });
      }

      // Refresh profile
      fetchProfile();
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  const handleLinkAccount = (provider: string) => {
    // Redirect to OAuth with linking intent
    signIn(provider, { callbackUrl: "/profile" });
  };

  const handleUnlinkAccount = async (provider: string) => {
    try {
      const res = await fetch(`/api/profile/accounts?provider=${provider}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(data.message);
      fetchProfile();
    } catch {
      toast.error(t("errors.generic"));
    }
  };

  const handleUpgradeGitHubAccess = async () => {
    setUpgradingGitHub(true);
    try {
      // First disconnect GitHub to clear old token
      const res = await fetch("/api/profile/accounts?provider=github", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        setUpgradingGitHub(false);
        return;
      }

      // Then redirect to sign in with GitHub (will request new scopes)
      signIn("github", { callbackUrl: "/profile" });
    } catch {
      toast.error(t("errors.generic"));
      setUpgradingGitHub(false);
    }
  };

  const isAccountLinked = (provider: string) => {
    return profile?.linkedAccounts.some((acc) => acc.provider === provider);
  };

  const getProviderIcon = (provider: string) => {
    if (provider === "google") {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      );
    }
    if (provider === "github") {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("profile.settings")}</h1>
        <p className="text-muted-foreground">
          {t("profile.manageSettings")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("profile.profileInfo")}
            </CardTitle>
            <CardDescription>
              {t("profile.updatePersonalInfo")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t("profile.emailCannotChange")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("profile.role")}</Label>
                <div>
                  <Badge variant="secondary">
                    {t(`roles.${profile?.role || "user"}`)}
                  </Badge>
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("profile.saveChanges")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t("profile.password")}
            </CardTitle>
            <CardDescription>
              {profile?.hasPassword
                ? t("profile.changePasswordDesc")
                : t("profile.setPasswordDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profile?.hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={saving}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {profile?.hasPassword ? t("profile.newPassword") : t("profile.password")}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t("profile.minChars")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                />
              </div>

              <Button type="submit" disabled={saving || !newPassword}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {profile?.hasPassword ? t("profile.changePassword") : t("profile.setPassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Linked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {t("profile.linkedAccounts")}
          </CardTitle>
          <CardDescription>
            {t("profile.linkAccountsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Google */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getProviderIcon("google")}
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">
                    {isAccountLinked("google")
                      ? t("profile.connected")
                      : t("profile.notConnected")}
                  </p>
                </div>
              </div>
              {isAccountLinked("google") ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Unlink className="w-4 h-4 mr-2" />
                      {t("profile.disconnect")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("profile.disconnectGoogle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("profile.disconnectWarning", { provider: "Google" })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleUnlinkAccount("google")}
                      >
                        {t("profile.disconnect")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkAccount("google")}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {t("profile.connect")}
                </Button>
              )}
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getProviderIcon("github")}
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    {isAccountLinked("github")
                      ? t("profile.connected")
                      : t("profile.notConnected")}
                  </p>
                </div>
              </div>
              {isAccountLinked("github") ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Unlink className="w-4 h-4 mr-2" />
                      {t("profile.disconnect")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("profile.disconnectGitHub")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("profile.disconnectWarning", { provider: "GitHub" })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleUnlinkAccount("github")}
                      >
                        {t("profile.disconnect")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkAccount("github")}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {t("profile.connect")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GitHub Integration - Only show if GitHub is connected */}
      {isAccountLinked("github") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              {t("github.integration")}
            </CardTitle>
            <CardDescription>
              {t("github.integrationDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getProviderIcon("github")}
                  <div>
                    <p className="font-medium">
                      {githubStatus?.username
                        ? `@${githubStatus.username}`
                        : "GitHub"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {githubStatus?.hasRepoScope
                        ? t("github.repoScopeGranted")
                        : t("github.repoScopeRequired")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {githubStatus?.hasRepoScope ? (
                    <Badge variant="default" className="bg-green-600">
                      {t("github.fullAccess")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {t("github.basicAccess")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {githubStatus?.hasRepoScope ? (
                  <Button
                    variant="outline"
                    onClick={() => setRepoManagerOpen(true)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    {t("github.manageRepos")}
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpgradeGitHubAccess}
                    disabled={upgradingGitHub}
                  >
                    {upgradingGitHub ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <GitBranch className="w-4 h-4 mr-2" />
                    )}
                    {t("github.upgradeAccess")}
                  </Button>
                )}
              </div>

              {!githubStatus?.hasRepoScope && (
                <p className="text-sm text-muted-foreground">
                  {t("github.upgradeAccessDesc")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repo Manager Dialog */}
      <RepoManager open={repoManagerOpen} onOpenChange={setRepoManagerOpen} />
    </div>
  );
}
