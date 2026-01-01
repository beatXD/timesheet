import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { ITimesheet, ITimesheetEntry, IUser, IVendor, ITeam } from "@/types";

interface TimesheetExportData {
  timesheet: ITimesheet;
  user: IUser;
  vendor?: IVendor;
  project?: { name?: string } | null;
  team?: ITeam;
}

// Minimal color palette
const colors = {
  black: "#000000",
  darkGray: "#374151",
  gray: "#6b7280",
  lightGray: "#9ca3af",
  border: "#e5e7eb",
  bgLight: "#f9fafb",
  bgAccent: "#fefce8", // Very subtle yellow for holidays
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  // Header
  header: {
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 4,
  },
  // Info Section
  infoSection: {
    flexDirection: "row",
    marginBottom: 20,
  },
  infoBlock: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    width: 90,
    fontSize: 8,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: colors.black,
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    paddingBottom: 6,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    minHeight: 18,
    alignItems: "center",
  },
  tableRowNonWorking: {
    backgroundColor: colors.bgLight,
  },
  tableRowHoliday: {
    backgroundColor: colors.bgAccent,
  },
  // Columns
  colDate: { width: 55, paddingRight: 8 },
  colType: { width: 55, paddingRight: 8 },
  colTask: { flex: 1, paddingRight: 8 },
  colTime: { width: 40, textAlign: "center" },
  colHours: { width: 35, textAlign: "center" },
  colRemark: { width: 140, paddingLeft: 8 },
  headerCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cell: {
    fontSize: 8,
    color: colors.black,
  },
  cellMuted: {
    fontSize: 8,
    color: colors.lightGray,
  },
  // Summary
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  summaryTable: {
    width: 180,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: colors.black,
    marginTop: 4,
    paddingTop: 6,
  },
  summaryLabel: {
    fontSize: 8,
    color: colors.gray,
  },
  summaryValue: {
    fontSize: 9,
    color: colors.black,
  },
  summaryLabelTotal: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  summaryValueTotal: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  // Signatures
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 30,
  },
  signatureBlock: {
    width: 200,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    marginBottom: 8,
    height: 30,
  },
  signatureLabel: {
    fontSize: 7,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  signatureText: {
    fontSize: 8,
    color: colors.darkGray,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
});

const entryTypeLabels: Record<string, string> = {
  working: "Work",
  weekend: "Weekend",
  holiday: "Holiday",
  leave: "Leave",
};

const TimesheetPDF = ({ data }: { data: TimesheetExportData }) => {
  const { timesheet, user, vendor, project, team } = data;
  const monthYear = format(
    new Date(timesheet.year, timesheet.month - 1),
    "MMMM yyyy"
  );
  const manDays = timesheet.totalBaseHours / 8;

  const projectTeamDisplay = [project?.name, team?.name]
    .filter(Boolean)
    .join(" / ") || "-";

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TIMESHEET</Text>
          <Text style={styles.subtitle}>{monthYear}</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user.contractRole || "-"}</Text>
            </View>
          </View>
          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendor</Text>
              <Text style={styles.infoValue}>{vendor?.name || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Project / Team</Text>
              <Text style={styles.infoValue}>{projectTeamDisplay}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerCell]}>Date</Text>
            <Text style={[styles.colType, styles.headerCell]}>Type</Text>
            <Text style={[styles.colTask, styles.headerCell]}>Task</Text>
            <Text style={[styles.colTime, styles.headerCell]}>In</Text>
            <Text style={[styles.colTime, styles.headerCell]}>Out</Text>
            <Text style={[styles.colHours, styles.headerCell]}>Base</Text>
            <Text style={[styles.colHours, styles.headerCell]}>Add</Text>
            <Text style={[styles.colRemark, styles.headerCell]}>Remark</Text>
          </View>

          {timesheet.entries.map((entry: ITimesheetEntry, index: number) => {
            const date = new Date(timesheet.year, timesheet.month - 1, entry.date);
            const dayName = format(date, "EEE");
            const isNonWorking = entry.type === "weekend" || entry.type === "leave";
            const isHoliday = entry.type === "holiday";

            const rowStyle = [
              styles.tableRow,
              isNonWorking && styles.tableRowNonWorking,
              isHoliday && styles.tableRowHoliday,
            ].filter(Boolean);

            return (
              <View key={index} style={rowStyle as any} wrap={false}>
                <Text style={[styles.colDate, styles.cell]}>
                  {entry.date} {dayName}
                </Text>
                <Text style={[styles.colType, entry.type === "working" ? styles.cell : styles.cellMuted]}>
                  {entryTypeLabels[entry.type] || entry.type}
                </Text>
                <Text style={[styles.colTask, styles.cell]}>
                  {entry.task || ""}
                </Text>
                <Text style={[styles.colTime, entry.timeIn ? styles.cell : styles.cellMuted]}>
                  {entry.timeIn || "-"}
                </Text>
                <Text style={[styles.colTime, entry.timeOut ? styles.cell : styles.cellMuted]}>
                  {entry.timeOut || "-"}
                </Text>
                <Text style={[styles.colHours, entry.baseHours > 0 ? styles.cell : styles.cellMuted]}>
                  {entry.baseHours}
                </Text>
                <Text style={[styles.colHours, entry.additionalHours > 0 ? styles.cell : styles.cellMuted]}>
                  {entry.additionalHours}
                </Text>
                <Text style={[styles.colRemark, styles.cell]}>
                  {entry.remark || ""}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Base Hours</Text>
              <Text style={styles.summaryValue}>{timesheet.totalBaseHours}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Additional Hours</Text>
              <Text style={styles.summaryValue}>{timesheet.totalAdditionalHours}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryLabelTotal}>Total Man-Days</Text>
              <Text style={styles.summaryValueTotal}>{manDays.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Resource Signature</Text>
            <Text style={styles.signatureText}>{user.name}</Text>
            <Text style={styles.signatureText}>{format(new Date(), "d MMMM yyyy")}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Client Signature</Text>
            <Text style={styles.signatureText}>Name: ____________________</Text>
            <Text style={styles.signatureText}>Date: ____________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated {format(new Date(), "d MMM yyyy, HH:mm")}
          </Text>
          <Text style={styles.footerText}>
            {user.name} - {monthYear}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateTimesheetPDF(
  data: TimesheetExportData
): Promise<Buffer> {
  const buffer = await renderToBuffer(<TimesheetPDF data={data} />);
  return Buffer.from(buffer);
}
