"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

const FAQ_COUNT = 6;

export function FAQSection() {
  const t = useTranslations("landing");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("faq.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("faq.subtitle")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {Array.from({ length: FAQ_COUNT }).map((_, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="bg-card border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex justify-between items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold pr-4">
                    {t(`faq.items.${i}.question`)}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-200"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  role="region"
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                      {t(`faq.items.${i}.answer`)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
