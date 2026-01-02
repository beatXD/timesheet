"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const tiers = [
  {
    key: "starter",
    plan: "free",
    price: "฿0",
    popular: false,
  },
  {
    key: "team",
    plan: "team",
    price: "฿990",
    popular: true,
  },
  {
    key: "enterprise",
    plan: "enterprise",
    price: "฿4,990",
    popular: false,
  },
];

export function PricingSection() {
  const t = useTranslations("landing");

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
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.key}
              className={`relative ${
                tier.popular
                  ? "border-primary shadow-xl scale-105"
                  : "border-border"
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t("pricing.popular")}
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <h3 className="text-2xl font-bold">
                  {t(`pricing.tiers.${tier.key}.name`)}
                </h3>
                <p className="text-muted-foreground">
                  {t(`pricing.tiers.${tier.key}.description`)}
                </p>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-5xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">
                    {t(`pricing.tiers.${tier.key}.period`)}
                  </span>
                </div>

                <ul className="space-y-3 text-left">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const feature = t.raw(`pricing.tiers.${tier.key}.features.${i}`) as string | undefined;
                    if (!feature) return null;
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>

              <CardFooter>
                <Link href={`/register?plan=${tier.plan}`} className="w-full">
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {t(`pricing.tiers.${tier.key}.cta`)}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
