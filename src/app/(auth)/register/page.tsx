"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, Check, Users, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SubscriptionPlan } from "@/types";

type Step = "plan" | "details" | "payment";

interface DBPlan {
  slug: SubscriptionPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  maxUsers: number;
  maxTeams: number;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dbPlans, setDbPlans] = useState<DBPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Mock payment state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Fetch plans from database
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (data.data) {
          setDbPlans(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setPlansLoading(false);
      }
    }
    fetchPlans();
  }, []);

  // Check for plan or invite in URL query params
  useEffect(() => {
    const planFromUrl = searchParams.get("plan") as SubscriptionPlan | null;
    const inviteFromUrl = searchParams.get("invite");
    const emailFromUrl = searchParams.get("email");

    if (inviteFromUrl) {
      // Coming from invite - register as free user (will join team after)
      setInviteToken(inviteFromUrl);
      setSelectedPlan("free");
      setStep("details");
      if (emailFromUrl) {
        setEmail(emailFromUrl);
      }
    } else if (planFromUrl && ["free", "team", "enterprise"].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl);
      setStep("details");
    }
  }, [searchParams]);

  const iconMap: Record<string, React.ReactNode> = {
    free: <User className="w-6 h-6" />,
    team: <Users className="w-6 h-6" />,
    enterprise: <Users className="w-6 h-6" />,
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const selectedDbPlan = dbPlans.find((p) => p.slug === selectedPlan);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setStep("details");
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }

    if (selectedPlan !== "free" && !teamName.trim()) {
      toast.error("Team name is required for paid plans");
      return;
    }

    // For paid plans, go to payment step
    if (selectedDbPlan && selectedDbPlan.monthlyPrice > 0) {
      setStep("payment");
      return;
    }

    // For free plan, register directly
    await handleRegister();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate mock payment
    if (!cardNumber || !cardExpiry || !cardCvc) {
      toast.error("Please fill in all payment details");
      return;
    }

    // Mock payment processing
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate payment delay

    // Continue with registration
    await handleRegister();
  };

  const handleRegister = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          plan: selectedPlan,
          teamName: selectedPlan !== "free" ? teamName : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("registrationFailed"));
        return;
      }

      toast.success(data.message);

      // Auto sign in after registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
      } else {
        // Auto-join happens during registration, just redirect to calendar
        router.push("/calendar");
        router.refresh();
      }
    } catch {
      toast.error(tErrors("generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    // Store selected plan in sessionStorage for OAuth callback
    if (selectedPlan) {
      sessionStorage.setItem("registerPlan", selectedPlan);
      if (teamName) {
        sessionStorage.setItem("registerTeamName", teamName);
      }
    }
    setOauthLoading(provider);
    signIn(provider, { callbackUrl: "/calendar" });
  };

  const handleBack = () => {
    if (step === "payment") {
      setStep("details");
    } else if (step === "details") {
      setStep("plan");
      setSelectedPlan(null);
    }
  };

  // Plan Selection Step
  if (step === "plan") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2" suppressHydrationWarning>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{t("createAccount")}</h1>
            <p className="text-muted-foreground mt-2">Choose your plan to get started</p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className={`grid gap-6 ${dbPlans.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              {dbPlans.map((plan) => (
                <Card
                  key={plan.slug}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedPlan === plan.slug ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handlePlanSelect(plan.slug)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {iconMap[plan.slug] || <User className="w-6 h-6" />}
                      </div>
                      {plan.slug === "team" && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">{formatPrice(plan.monthlyPrice)}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant={plan.slug === "team" ? "default" : "outline"}>
                      Get {plan.name}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Payment Step (Team plan only)
  if (step === "payment") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2" suppressHydrationWarning>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-4 h-8 w-8"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold">Payment Details</CardTitle>
            <CardDescription>
              {selectedDbPlan?.name || "Team"} Plan - {formatPrice(selectedDbPlan?.monthlyPrice || 0)}/month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="text-sm text-muted-foreground mb-2">This is a demo payment form</p>
                <p className="text-xs text-muted-foreground">Use any card number (e.g., 4242 4242 4242 4242)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Expiry</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCvc">CVC</Label>
                  <Input
                    id="cardCvc"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Pay {formatPrice(selectedDbPlan?.monthlyPrice || 0)} & Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Details Step
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2" suppressHydrationWarning>
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-4 h-8 w-8"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">{t("createAccount")}</CardTitle>
          <CardDescription>
            {selectedDbPlan?.name || selectedPlan} Plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Registration Form */}
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Team name for paid plans */}
            {selectedPlan !== "free" && (
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  type="text"
                  placeholder="My Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedDbPlan && selectedDbPlan.monthlyPrice > 0 ? "Continue to Payment" : t("createAccount")}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t("orSignUpWith")}
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("google")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
              )}
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("github")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "github" ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("signIn")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
