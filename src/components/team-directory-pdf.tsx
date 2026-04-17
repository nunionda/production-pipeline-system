"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { RoleGroup } from "@/lib/team";

// Reuse same Korean font as call-sheet-pdf.tsx
Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.9.woff2",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 9,
    padding: 24,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1E40AF",
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { fontSize: 14, fontWeight: 700, color: "#1E40AF" },
  subtitle: { fontSize: 9, color: "#6B7280" },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  tableHeaderText: { fontSize: 8, color: "#6B7280", fontWeight: 700 },
  sectionHeader: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: "#1E40AF" },
  row: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  colName: { width: "25%", fontWeight: 700 },
  colRole: { width: "20%", color: "#4B5563" },
  colPhone: { width: "25%" },
  colEmail: { width: "30%", color: "#6B7280" },
});

type Props = {
  projectTitle: string;
  date: string;
  groups: RoleGroup[];
};

export function TeamDirectoryPDF({ projectTitle, date, groups }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{projectTitle} 팀 연락망</Text>
          <Text style={styles.subtitle}>{date}</Text>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colName, styles.tableHeaderText]}>이름</Text>
          <Text style={[styles.colRole, styles.tableHeaderText]}>역할</Text>
          <Text style={[styles.colPhone, styles.tableHeaderText]}>전화번호</Text>
          <Text style={[styles.colEmail, styles.tableHeaderText]}>이메일</Text>
        </View>

        {/* Sections */}
        {groups.map((group) => (
          <View key={group.role}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
            </View>
            {group.members.map((m) => (
              <View key={m.id} style={styles.row}>
                <Text style={styles.colName}>{m.user.name}</Text>
                <Text style={styles.colRole}>{group.label}</Text>
                <Text style={styles.colPhone}>{m.user.phone ?? "—"}</Text>
                <Text style={styles.colEmail}>{m.user.email}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
