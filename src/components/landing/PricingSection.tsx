"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

interface DBPlan {
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
}

const tierKeyMap: Record<string, string> = {
  free: "starter",
  team: "team",
  enterprise: "enterprise",
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function PricingSection() {
  const t = useTranslations("landing");
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (data.data) {
          setPlans(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <section id="pricing" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("pricing.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const tierKey = tierKeyMap[plan.slug] || plan.slug;
              const isPopular = plan.slug === "team";

              return (
                <Card
                  key={plan.slug}
                  className={`relative ${
                    isPopular
                      ? "border-primary shadow-xl scale-105"
                      : "border-border"
                  }`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      {t("pricing.popular")}
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-2">
                    <h3 className="text-2xl font-bold">
                      {t(`pricing.tiers.${tierKey}.name`)}
                    </h3>
                    <p className="text-muted-foreground">
                      {t(`pricing.tiers.${tierKey}.description`)}
                    </p>
                  </CardHeader>

                  <CardContent className="text-center">
                    <div className="mb-6">
                      <span className="text-5xl font-bold">{formatPrice(plan.monthlyPrice)}</span>
                      <span className="text-muted-foreground">
                        {t(`pricing.tiers.${tierKey}.period`)}
                      </span>
                    </div>

                    <ul className="space-y-3 text-left">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Link href={`/register?plan=${plan.slug}`} className="w-full">
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                      >
                        {t(`pricing.tiers.${tierKey}.cta`)}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
