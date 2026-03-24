"use client";

import { useTranslations } from "next-intl";
import { Check, X, AlertTriangle } from "lucide-react";

type CellStatus = "yes" | "no" | "partial";

const CRITERIA_DATA: { timesheet: CellStatus; spreadsheet: CellStatus; otherTools: CellStatus }[] = [
  { timesheet: "yes", spreadsheet: "no", otherTools: "partial" },
  { timesheet: "yes", spreadsheet: "no", otherTools: "no" },
  { timesheet: "yes", spreadsheet: "no", otherTools: "yes" },
  { timesheet: "yes", spreadsheet: "no", otherTools: "no" },
  { timesheet: "yes", spreadsheet: "partial", otherTools: "yes" },
  { timesheet: "yes", spreadsheet: "no", otherTools: "yes" },
  { timesheet: "yes", spreadsheet: "yes", otherTools: "partial" },
];

function StatusIcon({ status }: { status: CellStatus }) {
  switch (status) {
    case "yes":
      return <Check className="h-5 w-5 text-green-500 mx-auto" />;
    case "no":
      return <X className="h-5 w-5 text-red-400 mx-auto" />;
    case "partial":
      return <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />;
  }
}

export function ComparisonSection() {
  const t = useTranslations("landing");

  return (
    <section id="comparison" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("comparison.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("comparison.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-4 px-4" />
                <th className="py-4 px-4 text-primary font-bold border-b-2 border-primary bg-primary/5 rounded-t-lg">
                  {t("comparison.columns.timesheet")}
                </th>
                <th className="py-4 px-4 text-muted-foreground font-medium border-b-2 border-border">
                  {t("comparison.columns.spreadsheet")}
                </th>
                <th className="py-4 px-4 text-muted-foreground font-medium border-b-2 border-border">
                  {t("comparison.columns.otherTools")}
                </th>
              </tr>
            </thead>
            <tbody>
              {CRITERIA_DATA.map((row, i) => (
                <tr key={i}>
                  <td className="py-4 px-4 font-medium border-b border-border">
                    {t(`comparison.criteria.${i}.label`)}
                  </td>
                  <td className="py-4 px-4 border-b border-border bg-primary/5 text-center">
                    <StatusIcon status={row.timesheet} />
                  </td>
                  <td className="py-4 px-4 border-b border-border text-center">
                    <StatusIcon status={row.spreadsheet} />
                  </td>
                  <td className="py-4 px-4 border-b border-border text-center">
                    <StatusIcon status={row.otherTools} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
