"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User, Users, Shield, Check } from "lucide-react";

const TAB_KEYS = ["employee", "leader", "admin"] as const;
const TAB_ICONS = [User, Users, Shield];
const FEATURE_COUNT = 5;

export function UseCaseSection() {
  const t = useTranslations("landing");
  const [activeTab, setActiveTab] = useState(0);

  const tabKey = TAB_KEYS[activeTab];
  const TabIcon = TAB_ICONS[activeTab];

  return (
    <section id="use-cases" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("useCases.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("useCases.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex">
            {TAB_KEYS.map((key, i) => {
              const Icon = TAB_ICONS[i];
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(`useCases.tabs.${key}.title`)}
                </button>
              );
            })}
          </div>

          <div className="bg-card border rounded-b-xl rounded-tr-xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-muted-foreground mb-4">
                  {t(`useCases.tabs.${tabKey}.description`)}
                </p>
                <ul className="space-y-3">
                  {Array.from({ length: FEATURE_COUNT }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm">
                        {t(`useCases.tabs.${tabKey}.features.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-primary/5 rounded-lg flex items-center justify-center min-h-[200px]">
                <TabIcon className="h-16 w-16 text-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
