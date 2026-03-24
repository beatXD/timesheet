"use client";

import { useTranslations } from "next-intl";

const COMPANY_COUNT = 5;

export function TrustedBySection() {
  const t = useTranslations("landing");

  return (
    <section id="trusted-by" className="py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">{t("trustedBy.stat")}</span>
          <span className="text-muted-foreground ml-2">
            {t("trustedBy.statLabel")}
          </span>
        </div>
        <div className="w-16 h-0.5 bg-primary mx-auto mb-6" />
        <div className="flex justify-center items-center gap-4 flex-wrap">
          {Array.from({ length: COMPANY_COUNT }).map((_, i) => (
            <div
              key={i}
              className="bg-muted rounded-lg px-6 py-3 text-muted-foreground font-semibold text-sm"
            >
              {t(`trustedBy.company${i}`)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
