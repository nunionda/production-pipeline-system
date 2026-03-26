"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register Korean font
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
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1E40AF",
  },
  headerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  headerMetaText: { fontSize: 8, color: "#6b7280" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: "#1E40AF",
    color: "#ffffff",
    padding: "3 6",
    marginBottom: 0,
  },
  table: { borderWidth: 1, borderColor: "#d1d5db" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowLast: { flexDirection: "row" },
  cell: { padding: "4 6", fontSize: 8 },
  cellBold: { padding: "4 6", fontSize: 8, fontWeight: 700 },
  // column widths
  colScene: { width: "8%" },
  colLocation: { width: "22%" },
  colIntExt: { width: "7%" },
  colTime: { width: "8%" },
  colPages: { width: "8%" },
  colCast: { width: "47%" },
  colName: { width: "30%" },
  colRole: { width: "25%" },
  colCallTime: { width: "20%" },
  colMakeup: { width: "20%" },
  colStandby: { width: "25%" },
  notesBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 8,
    minHeight: 40,
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 4,
  },
});

const INTEXTKR: Record<string, string> = { INT: "실내", EXT: "실외", INT_EXT: "실내외" };
const TIMEDAYKR: Record<string, string> = { D: "낮", N: "밤", DN: "저녁", ND: "새벽" };

interface CallSheetPDFProps {
  projectTitle: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  location: string;
  callTime: string;
  shootTime: string;
  scenes: Array<{
    number: number;
    intExt: string;
    location: string;
    timeOfDay: string;
    pageCount?: number | null;
    characters: string[];
  }>;
  cast: Array<{
    name: string;
    callTime: string;
    makeupTime?: string;
    standbyLocation?: string;
  }>;
  crew?: Array<{ department: string; name: string; callTime: string }>;
  equipment?: Array<{ name: string; status?: string }>;
  meals?: Array<{ time: string; menu: string; location: string }>;
  notes?: string | null;
}

export function CallSheetPDF({
  projectTitle,
  dayNumber,
  date,
  location,
  callTime,
  shootTime,
  scenes,
  cast,
  crew = [],
  equipment = [],
  meals = [],
  notes,
}: CallSheetPDFProps) {
  const dateObj = new Date(date);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${String(dateObj.getDate()).padStart(2, "0")} (${weekdays[dateObj.getDay()]})`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{projectTitle} — 콜시트</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaText}>촬영 D+{dayNumber}  {dateStr}</Text>
            <Text style={styles.headerMetaText}>촬영 장소: {location || "미정"}</Text>
            <Text style={styles.headerMetaText}>호출: {callTime}  촬영: {shootTime || "—"}</Text>
          </View>
        </View>

        {/* Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>씬 목록</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cellBold, styles.colScene]}>씬#</Text>
              <Text style={[styles.cellBold, styles.colLocation]}>장소</Text>
              <Text style={[styles.cellBold, styles.colIntExt]}>IN/EX</Text>
              <Text style={[styles.cellBold, styles.colTime]}>시간대</Text>
              <Text style={[styles.cellBold, styles.colPages]}>페이지</Text>
              <Text style={[styles.cellBold, styles.colCast]}>등장인물</Text>
            </View>
            {scenes.map((scene, i) => (
              <View
                key={i}
                style={i === scenes.length - 1 ? styles.tableRowLast : styles.tableRow}
              >
                <Text style={[styles.cell, styles.colScene]}>{scene.number}</Text>
                <Text style={[styles.cell, styles.colLocation]}>{scene.location}</Text>
                <Text style={[styles.cell, styles.colIntExt]}>{INTEXTKR[scene.intExt] || scene.intExt}</Text>
                <Text style={[styles.cell, styles.colTime]}>{TIMEDAYKR[scene.timeOfDay] || scene.timeOfDay}</Text>
                <Text style={[styles.cell, styles.colPages]}>{scene.pageCount ? `${scene.pageCount}p` : "—"}</Text>
                <Text style={[styles.cell, styles.colCast]}>{scene.characters.join(", ")}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cast */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>출연진 호출</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cellBold, styles.colName]}>이름</Text>
              <Text style={[styles.cellBold, styles.colRole]}>역할</Text>
              <Text style={[styles.cellBold, styles.colCallTime]}>호출 시간</Text>
              <Text style={[styles.cellBold, styles.colMakeup]}>분장 시간</Text>
              <Text style={[styles.cellBold, styles.colStandby]}>대기 장소</Text>
            </View>
            {cast.map((c, i) => (
              <View key={i} style={i === cast.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={[styles.cell, styles.colName]}>{c.name}</Text>
                <Text style={[styles.cell, styles.colRole]}>—</Text>
                <Text style={[styles.cell, styles.colCallTime]}>{c.callTime || "—"}</Text>
                <Text style={[styles.cell, styles.colMakeup]}>{c.makeupTime || "—"}</Text>
                <Text style={[styles.cell, styles.colStandby]}>{c.standbyLocation || "—"}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Crew */}
        {crew.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>부서별 호출 시간</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "30%" }]}>부서</Text>
                <Text style={[styles.cellBold, { width: "40%" }]}>담당자</Text>
                <Text style={[styles.cellBold, { width: "30%" }]}>호출 시간</Text>
              </View>
              {crew.map((c, i) => (
                <View key={i} style={i === crew.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.cell, { width: "30%" }]}>{c.department}</Text>
                  <Text style={[styles.cell, { width: "40%" }]}>{c.name}</Text>
                  <Text style={[styles.cell, { width: "30%" }]}>{c.callTime}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Meals */}
        {meals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>식사 스케줄</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "20%" }]}>시간</Text>
                <Text style={[styles.cellBold, { width: "40%" }]}>메뉴</Text>
                <Text style={[styles.cellBold, { width: "40%" }]}>장소</Text>
              </View>
              {meals.map((m, i) => (
                <View key={i} style={i === meals.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.cell, { width: "20%" }]}>{m.time}</Text>
                  <Text style={[styles.cell, { width: "40%" }]}>{m.menu}</Text>
                  <Text style={[styles.cell, { width: "40%" }]}>{m.location}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>특이사항</Text>
          <View style={styles.notesBox}>
            <Text>{notes || "없음"}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{projectTitle} — 콜시트 D+{dayNumber}</Text>
          <Text>{dateStr}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
