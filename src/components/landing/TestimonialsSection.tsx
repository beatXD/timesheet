"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

const TESTIMONIAL_STYLES = [
  { initial: "S", bgClass: "bg-primary/10", textClass: "text-primary" },
  { initial: "P", bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-600 dark:text-blue-400" },
  { initial: "W", bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-600 dark:text-amber-400" },
];

export function TestimonialsSection() {
  const t = useTranslations("landing");

  return (
    <section id="testimonials" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("testimonials.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIAL_STYLES.map((style, i) => (
            <div
              key={i}
              className="bg-card border rounded-xl p-6 shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                &ldquo;{t(`testimonials.items.${i}.quoteBefore`)}
                <strong className="font-semibold text-foreground">
                  {t(`testimonials.items.${i}.quoteBold`)}
                </strong>
                {t(`testimonials.items.${i}.quoteAfter`)}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${style.bgClass} ${style.textClass}`}
                >
                  {style.initial}
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {t(`testimonials.items.${i}.name`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`testimonials.items.${i}.role`)}, {t(`testimonials.items.${i}.company`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
