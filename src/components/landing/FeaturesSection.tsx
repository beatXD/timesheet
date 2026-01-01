"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, CheckCircle, Calendar, FileText, Globe } from "lucide-react";

const features = [
  { icon: Clock, key: "timeTracking" },
  { icon: Users, key: "teamManagement" },
  { icon: CheckCircle, key: "approvalWorkflow" },
  { icon: Calendar, key: "leaveManagement" },
  { icon: FileText, key: "exportReports" },
  { icon: Globe, key: "thaiHolidays" },
];

export function FeaturesSection() {
  const t = useTranslations("landing");

  return (
    <section id="features" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("features.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.key} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t(`features.items.${feature.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`features.items.${feature.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
