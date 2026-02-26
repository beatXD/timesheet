import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { ITimesheet, ITimesheetEntry, IUser, ITeam } from "@/types";

interface TimesheetExportData {
  timesheet: ITimesheet;
  user: IUser;
  project?: { name?: string } | null;
  team?: ITeam;
}

const entryTypeLabels: Record<string, string> = {
  working: "Working Day",
  weekend: "Weekend",
  holiday: "Holiday",
  leave: "Leave",
};

export async function generateTimesheetExcel(data: TimesheetExportData): Promise<Buffer> {
  const { timesheet, user, project, team } = data;

  // Build project/team display string
  const projectTeamDisplay = [project?.name, team?.name]
    .filter(Boolean)
    .join(" / ") || "-";

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Timesheet");

  // Set column widths
  worksheet.columns = [
    { width: 6 },  // Date
    { width: 15 }, // Type
    { width: 60 }, // Task
    { width: 10 }, // Time In
    { width: 10 }, // Time Out
    { width: 12 }, // Base Hours
    { width: 12 }, // Additional Hours
    { width: 25 }, // Remark
  ];

  // Header section
  const monthYear = format(
    new Date(timesheet.year, timesheet.month - 1),
    "MMMM yyyy"
  );

  worksheet.addRow(["Month:", monthYear]);
  worksheet.addRow([]);

  // Resource info
  worksheet.addRow(["Resource name:", user.name]);
  worksheet.addRow(["Project / Team:", projectTeamDisplay]);
  worksheet.addRow([]);

  // Table header
  const headerRow = worksheet.addRow([
    "Date",
    "Type",
    "Task",
    "Time In",
    "Time Out",
    "Base Hours",
    "Add. Hours",
    "Remark",
  ]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Data rows
  timesheet.entries.forEach((entry: ITimesheetEntry) => {
    const date = new Date(timesheet.year, timesheet.month - 1, entry.date);
    const dayName = format(date, "EEE");

    const row = worksheet.addRow([
      `${entry.date} (${dayName})`,
      entryTypeLabels[entry.type] || entry.type,
      entry.task || "",
      entry.timeIn || "",
      entry.timeOut || "",
      entry.baseHours || 0,
      entry.additionalHours || 0,
      entry.remark || "",
    ]);

    // Color coding based on type
    if (entry.type === "weekend") {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F0F0" },
        };
      });
    } else if (entry.type === "holiday") {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF9C4" },
        };
      });
    } else if (entry.type === "leave") {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE3F2FD" },
        };
      });
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Summary section
  worksheet.addRow([]);
  const totalRow = worksheet.addRow([
    "",
    "",
    "",
    "",
    "Total:",
    timesheet.totalBaseHours,
    timesheet.totalAdditionalHours,
    "",
  ]);
  totalRow.font = { bold: true };

  const manDays = timesheet.totalBaseHours / 8;
  worksheet.addRow([
    "",
    "",
    "",
    "",
    "Total Man-Days:",
    manDays.toFixed(2),
    "",
    "",
  ]);

  // Signature section
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow(["Resource's signatory:", "", "", "", "Client's signatory:"]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow([`Name: ${user.name}`, "", "", "", "Name:"]);
  worksheet.addRow([
    format(new Date(), "MMMM dd, yyyy"),
    "",
    "",
    "",
    "Date:",
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
