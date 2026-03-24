"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}

function CalendarMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const days = (t("screenshots.mockup.calendar.days") as string).split(",");
  const cells = [
    null, null, null, null, null, "weekend", "weekend",
    "work", "work", "work", "work", "work", "weekend", "weekend",
    "work", "work", "holiday", "work", "work", "weekend", "weekend",
    "work", "leave", "work", "work", "work", "weekend", "weekend",
    "work", "work", "work", "work", "work", "weekend", "weekend",
  ];
  const cellStyles: Record<string, string> = {
    work: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    weekend: "bg-muted text-muted-foreground",
    holiday: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    leave: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  };
  const cellLabels: Record<string, string> = {
    work: t("screenshots.mockup.calendar.work") as string,
    weekend: t("screenshots.mockup.calendar.weekend") as string,
    holiday: t("screenshots.mockup.calendar.holiday") as string,
    leave: t("screenshots.mockup.calendar.leave") as string,
  };

  return (
    <div>
      <p className="text-center font-semibold mb-3">{t("screenshots.mockup.calendar.month")}</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`text-center text-[10px] rounded p-1.5 ${cell ? cellStyles[cell] : ""}`}
          >
            {cell ? cellLabels[cell] : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const rows = [
    { name: "สมชาย ว.", month: "Mar 2026", initial: "ส", status: "pending" },
    { name: "Priya N.", month: "Mar 2026", initial: "P", status: "approved" },
    { name: "วิภา จ.", month: "Mar 2026", initial: "ว", status: "pending" },
    { name: "John D.", month: "Feb 2026", initial: "J", status: "approved" },
  ];

  return (
    <div>
      <p className="font-semibold mb-3">{t("screenshots.mockup.approval.title")}</p>
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
              {row.initial}
            </div>
            <span className="text-xs font-medium flex-1">{row.name}</span>
            <span className="text-[10px] text-muted-foreground">{row.month}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              row.status === "pending"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            }`}>
              {t(`screenshots.mockup.approval.${row.status}`)}
            </span>
            {row.status === "pending" && (
              <div className="flex gap-1">
                <button className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  {t("screenshots.mockup.approval.approve")}
                </button>
                <button className="text-[9px] border px-2 py-0.5 rounded">
                  {t("screenshots.mockup.approval.reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaveMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const balances = [
    { key: "annual", used: 10, total: 15 },
    { key: "sick", used: 2, total: 30 },
    { key: "personal", used: 1, total: 5 },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="font-semibold mb-3">{t("screenshots.mockup.leave.formTitle")}</p>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">{t("screenshots.mockup.leave.leaveType")}</p>
            <div className="bg-muted rounded px-3 py-1.5 text-xs">{t("screenshots.mockup.leave.annualLeave")}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("screenshots.mockup.leave.dateFrom")}</p>
              <div className="bg-muted rounded px-3 py-1.5 text-xs text-muted-foreground">2026-03-25</div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("screenshots.mockup.leave.dateTo")}</p>
              <div className="bg-muted rounded px-3 py-1.5 text-xs text-muted-foreground">2026-03-26</div>
            </div>
          </div>
          <button className="bg-primary text-primary-foreground text-xs px-4 py-1.5 rounded w-full">
            {t("screenshots.mockup.leave.submit")}
          </button>
        </div>
      </div>
      <div>
        <p className="font-semibold mb-3">{t("screenshots.mockup.leave.balanceTitle")}</p>
        <div className="space-y-3">
          {balances.map((b) => (
            <div key={b.key}>
              <div className="flex justify-between text-xs mb-1">
                <span>{t(`screenshots.mockup.leave.${b.key}`)}</span>
                <span className="text-muted-foreground">{b.used}/{b.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(b.used / b.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductScreenshotsSection() {
  const t = useTranslations("landing");
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { key: "calendar", component: <CalendarMockup t={t} /> },
    { key: "approval", component: <ApprovalMockup t={t} /> },
    { key: "leave", component: <LeaveMockup t={t} /> },
  ];

  return (
    <section id="screenshots" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("screenshots.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("screenshots.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-2 mb-6">
            {tabs.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t(`screenshots.tabs.${tab.key}`)}
              </button>
            ))}
          </div>

          <BrowserFrame>{tabs[activeTab].component}</BrowserFrame>
        </div>
      </div>
    </section>
  );
}
