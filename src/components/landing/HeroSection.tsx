"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  const t = useTranslations("landing");

  return (
    <section className="pt-32 pb-20 px-4">
      <div className="container mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          {t("hero.badge")}
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          {t("hero.title")}
          <span className="text-primary block mt-2">{t("hero.titleHighlight")}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
          {t("hero.subtitle")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-6">
              {t("hero.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              <Play className="mr-2 h-5 w-5" />
              {t("hero.learnMore")}
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">10k+</div>
            <div className="text-muted-foreground">{t("hero.stats.users")}</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
            <div className="text-muted-foreground">{t("hero.stats.companies")}</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">99.9%</div>
            <div className="text-muted-foreground">{t("hero.stats.uptime")}</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
            <div className="text-muted-foreground">{t("hero.stats.support")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
