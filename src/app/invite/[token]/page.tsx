"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Users, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InviteData {
  token: string;
  teamName: string;
  teamId: string;
  adminName: string;
  expiresAt: string;
  remainingUses: number;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: PageProps) {
  const { token } = use(params);
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || t("invite.invalidLink"));
          return;
        }

        setInvite(data.data);
      } catch {
        setError(t("invite.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token, t]);

  const handleJoin = async () => {
    if (!session?.user) {
      // Store token and redirect to login
      sessionStorage.setItem("pendingInviteToken", token);
      router.push("/login");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("invite.failedToJoin"));
        return;
      }

      setJoined(true);
      toast.success(t("invite.joinedSuccessfully"));

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch {
      toast.error(t("invite.failedToJoin"));
    } finally {
      setJoining(false);
    }
  };

  // Check for pending invite after login
  useEffect(() => {
    if (status === "authenticated" && !joined) {
      const pendingToken = sessionStorage.getItem("pendingInviteToken");
      if (pendingToken === token) {
        sessionStorage.removeItem("pendingInviteToken");
        handleJoin();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token, joined]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>{t("invite.invalidInvite")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/login">{t("auth.backToLogin")}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{t("invite.welcomeToTeam")}</CardTitle>
            <CardDescription>
              {t("invite.joinedTeam", { teamName: invite?.teamName || "" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              {t("invite.redirecting")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = new Date(invite?.expiresAt || "");
  const timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>{t("invite.youreInvited")}</CardTitle>
          <CardDescription>
            {t("invite.invitedToJoin", {
              teamName: invite?.teamName || "",
              adminName: invite?.adminName || "",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("common.team")}</p>
                <p className="text-sm text-muted-foreground">{invite?.teamName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("invite.expiresIn")}</p>
                <p className="text-sm text-muted-foreground">
                  {hoursRemaining}h {minutesRemaining}m
                </p>
              </div>
            </div>
          </div>

          {!session?.user && (
            <p className="text-sm text-muted-foreground text-center">
              {t("invite.loginToJoin")}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {session?.user ? (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("invite.joining")}
                </>
              ) : (
                t("invite.joinTeam")
              )}
            </Button>
          ) : (
            <>
              <Button className="w-full" asChild>
                <Link href="/login">{t("auth.signIn")}</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/register">{t("auth.signUp")}</Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
