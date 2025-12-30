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
import type { ITimesheet, ITimesheetEntry, IUser, IVendor, IProject } from "@/types";

interface TimesheetExportData {
  timesheet: ITimesheet;
  user: IUser;
  vendor?: IVendor;
  project?: IProject;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  headerLabel: {
    width: 120,
    fontWeight: "bold",
  },
  headerValue: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    minHeight: 20,
    alignItems: "center",
  },
  tableRowWeekend: {
    backgroundColor: "#f5f5f5",
  },
  tableRowHoliday: {
    backgroundColor: "#fff9c4",
  },
  tableRowLeave: {
    backgroundColor: "#e3f2fd",
  },
  col1: { width: 30, paddingHorizontal: 2 },
  col2: { width: 60, paddingHorizontal: 2 },
  col3: { width: 200, paddingHorizontal: 2 },
  col4: { width: 40, paddingHorizontal: 2 },
  col5: { width: 40, paddingHorizontal: 2 },
  col6: { width: 40, paddingHorizontal: 2, textAlign: "center" },
  col7: { width: 40, paddingHorizontal: 2, textAlign: "center" },
  col8: { width: 70, paddingHorizontal: 2 },
  headerCell: {
    fontWeight: "bold",
    fontSize: 8,
  },
  cell: {
    fontSize: 8,
  },
  summary: {
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  summaryLabel: {
    width: 150,
    fontWeight: "bold",
  },
  summaryValue: {
    width: 100,
  },
  signature: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: 200,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderColor: "#000",
    marginTop: 40,
    marginBottom: 5,
  },
});

const entryTypeLabels: Record<string, string> = {
  working: "Working Day",
  weekend: "Weekend",
  holiday: "Holiday",
  leave: "Leave",
};

const TimesheetPDF = ({ data }: { data: TimesheetExportData }) => {
  const { timesheet, user, vendor, project } = data;
  const monthYear = format(
    new Date(timesheet.year, timesheet.month - 1),
    "MMMM yyyy"
  );
  const manDays = timesheet.totalBaseHours / 8;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Timesheet - {monthYear}</Text>

        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Vendor:</Text>
            <Text style={styles.headerValue}>{vendor?.name || "-"}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Resource Name:</Text>
            <Text style={styles.headerValue}>{user.name}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Project / Team:</Text>
            <Text style={styles.headerValue}>{project?.name || "-"}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Contract Role:</Text>
            <Text style={styles.headerValue}>{user.contractRole || "-"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.headerCell]}>Date</Text>
            <Text style={[styles.col2, styles.headerCell]}>Type</Text>
            <Text style={[styles.col3, styles.headerCell]}>Task</Text>
            <Text style={[styles.col4, styles.headerCell]}>In</Text>
            <Text style={[styles.col5, styles.headerCell]}>Out</Text>
            <Text style={[styles.col6, styles.headerCell]}>Base</Text>
            <Text style={[styles.col7, styles.headerCell]}>Add</Text>
            <Text style={[styles.col8, styles.headerCell]}>Remark</Text>
          </View>

          {timesheet.entries.map((entry: ITimesheetEntry, index: number) => {
            const date = new Date(timesheet.year, timesheet.month - 1, entry.date);
            const dayName = format(date, "EEE");
            const rowStyle = [
              styles.tableRow,
              entry.type === "weekend" && styles.tableRowWeekend,
              entry.type === "holiday" && styles.tableRowHoliday,
              entry.type === "leave" && styles.tableRowLeave,
            ].filter(Boolean);

            return (
              <View key={index} style={rowStyle as any}>
                <Text style={[styles.col1, styles.cell]}>
                  {entry.date} {dayName}
                </Text>
                <Text style={[styles.col2, styles.cell]}>
                  {entryTypeLabels[entry.type] || entry.type}
                </Text>
                <Text style={[styles.col3, styles.cell]}>
                  {(entry.task || "").slice(0, 100)}
                </Text>
                <Text style={[styles.col4, styles.cell]}>
                  {entry.timeIn || ""}
                </Text>
                <Text style={[styles.col5, styles.cell]}>
                  {entry.timeOut || ""}
                </Text>
                <Text style={[styles.col6, styles.cell]}>
                  {entry.baseHours || 0}
                </Text>
                <Text style={[styles.col7, styles.cell]}>
                  {entry.additionalHours || 0}
                </Text>
                <Text style={[styles.col8, styles.cell]}>
                  {(entry.remark || "").slice(0, 30)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Base Hours:</Text>
            <Text style={styles.summaryValue}>{timesheet.totalBaseHours}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Additional Hours:</Text>
            <Text style={styles.summaryValue}>
              {timesheet.totalAdditionalHours}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Man-Days:</Text>
            <Text style={styles.summaryValue}>{manDays.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text>Resource&apos;s Signatory</Text>
            <Text>Name: {user.name}</Text>
            <Text>Date: {format(new Date(), "MMMM dd, yyyy")}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text>Client&apos;s Signatory</Text>
            <Text>Name: _________________</Text>
            <Text>Date: _________________</Text>
          </View>
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
