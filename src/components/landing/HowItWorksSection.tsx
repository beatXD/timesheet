"use client";

import { useTranslations } from "next-intl";
import { UserPlus, Clock, CheckCircle } from "lucide-react";

const steps = [
  { icon: UserPlus, key: "signup", number: "01" },
  { icon: Clock, key: "track", number: "02" },
  { icon: CheckCircle, key: "approve", number: "03" },
];

export function HowItWorksSection() {
  const t = useTranslations("landing");

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border" />
                )}

                <div className="text-center">
                  {/* Number Badge */}
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    {t(`howItWorks.steps.${step.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`howItWorks.steps.${step.key}.description`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
