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
import type { ITimesheet, ITimesheetEntry, IUser, IVendor, IProject, ITeam } from "@/types";

interface TimesheetExportData {
  timesheet: ITimesheet;
  user: IUser;
  vendor?: IVendor;
  project?: IProject;
  team?: ITeam;
}

// Color palette
const colors = {
  primary: "#1e40af", // Blue-800
  primaryLight: "#dbeafe", // Blue-100
  headerBg: "#1e3a5f",
  headerText: "#ffffff",
  tableBorder: "#d1d5db",
  tableHeaderBg: "#f3f4f6",
  weekendBg: "#f9fafb",
  holidayBg: "#fef9c3",
  leaveBg: "#dbeafe",
  text: "#111827",
  textMuted: "#6b7280",
  summaryBg: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  // Header Section
  headerSection: {
    marginBottom: 15,
  },
  titleBar: {
    backgroundColor: colors.headerBg,
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.headerText,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    color: colors.headerText,
    textAlign: "center",
    marginTop: 2,
    opacity: 0.9,
  },
  // Info Grid
  infoGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  infoColumn: {
    flex: 1,
    paddingHorizontal: 5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "center",
  },
  infoLabel: {
    width: 85,
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: "bold",
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: colors.text,
  },
  infoDivider: {
    width: 1,
    backgroundColor: colors.tableBorder,
    marginHorizontal: 10,
  },
  // Table
  table: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: colors.tableBorder,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.headerBg,
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.tableBorder,
    minHeight: 18,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableRowWeekend: {
    backgroundColor: colors.weekendBg,
  },
  tableRowHoliday: {
    backgroundColor: colors.holidayBg,
  },
  tableRowLeave: {
    backgroundColor: colors.leaveBg,
  },
  // Column definitions
  colDate: { width: 50, paddingHorizontal: 4 },
  colType: { width: 65, paddingHorizontal: 4 },
  colTask: { width: 160, paddingHorizontal: 4 },
  colTime: { width: 35, paddingHorizontal: 2, textAlign: "center" },
  colHours: { width: 30, paddingHorizontal: 2, textAlign: "center" },
  colRemark: { flex: 1, paddingHorizontal: 4 },
  headerCell: {
    fontWeight: "bold",
    fontSize: 8,
    color: colors.headerText,
  },
  cell: {
    fontSize: 8,
    color: colors.text,
  },
  cellMuted: {
    fontSize: 8,
    color: colors.textMuted,
  },
  // Summary Section
  summarySection: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    backgroundColor: colors.summaryBg,
    borderWidth: 1,
    borderColor: colors.tableBorder,
    borderRadius: 4,
    padding: 10,
    width: 200,
  },
  summaryTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.tableBorder,
    paddingBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 8,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.text,
  },
  summaryTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.tableBorder,
  },
  summaryTotalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
  },
  summaryTotalValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
  },
  // Signature Section
  signatureSection: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  signatureBlock: {
    width: 220,
    alignItems: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderColor: colors.text,
    width: "100%",
    marginBottom: 6,
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 15,
    left: 25,
    right: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.tableBorder,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
  },
});

const entryTypeLabels: Record<string, string> = {
  working: "Working",
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

  // Build project/team display string
  const projectTeamDisplay = [project?.name, team?.name]
    .filter(Boolean)
    .join(" / ") || "-";

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>TIMESHEET</Text>
            <Text style={styles.subtitle}>{monthYear}</Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Resource Name</Text>
                <Text style={styles.infoValue}>{user.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contract Role</Text>
                <Text style={styles.infoValue}>{user.contractRole || "-"}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoColumn}>
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
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerCell]}>Date</Text>
            <Text style={[styles.colType, styles.headerCell]}>Type</Text>
            <Text style={[styles.colTask, styles.headerCell]}>Task Description</Text>
            <Text style={[styles.colTime, styles.headerCell]}>In</Text>
            <Text style={[styles.colTime, styles.headerCell]}>Out</Text>
            <Text style={[styles.colHours, styles.headerCell]}>Base</Text>
            <Text style={[styles.colHours, styles.headerCell]}>Add</Text>
            <Text style={[styles.colRemark, styles.headerCell]}>Remark</Text>
          </View>

          {timesheet.entries.map((entry: ITimesheetEntry, index: number) => {
            const date = new Date(timesheet.year, timesheet.month - 1, entry.date);
            const dayName = format(date, "EEE");
            const rowStyle = [
              styles.tableRow,
              index % 2 === 1 && entry.type === "working" && styles.tableRowAlt,
              entry.type === "weekend" && styles.tableRowWeekend,
              entry.type === "holiday" && styles.tableRowHoliday,
              entry.type === "leave" && styles.tableRowLeave,
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
                  {(entry.task || "").slice(0, 80)}
                </Text>
                <Text style={[styles.colTime, styles.cell]}>
                  {entry.timeIn || "-"}
                </Text>
                <Text style={[styles.colTime, styles.cell]}>
                  {entry.timeOut || "-"}
                </Text>
                <Text style={[styles.colHours, entry.baseHours > 0 ? styles.cell : styles.cellMuted]}>
                  {entry.baseHours || 0}
                </Text>
                <Text style={[styles.colHours, entry.additionalHours > 0 ? styles.cell : styles.cellMuted]}>
                  {entry.additionalHours || 0}
                </Text>
                <Text style={[styles.colRemark, styles.cell]}>
                  {(entry.remark || "").slice(0, 60)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Base Hours</Text>
              <Text style={styles.summaryValue}>{timesheet.totalBaseHours} hrs</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Additional Hours</Text>
              <Text style={styles.summaryValue}>{timesheet.totalAdditionalHours} hrs</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Man-Days</Text>
              <Text style={styles.summaryTotalValue}>{manDays.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureTitle}>Resource Signature</Text>
            <Text style={styles.signatureText}>Name: {user.name}</Text>
            <Text style={styles.signatureText}>Date: {format(new Date(), "dd MMMM yyyy")}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureTitle}>Client Signature</Text>
            <Text style={styles.signatureText}>Name: _______________________</Text>
            <Text style={styles.signatureText}>Date: _______________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {format(new Date(), "dd MMM yyyy, HH:mm")}
          </Text>
          <Text style={styles.footerText}>
            {vendor?.name ? `${vendor.name} - ` : ""}{user.name} - {monthYear}
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
