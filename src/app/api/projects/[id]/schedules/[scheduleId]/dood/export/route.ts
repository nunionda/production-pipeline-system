import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; scheduleId: string }> };

// GET /api/projects/[id]/schedules/[scheduleId]/dood/export
// Returns an Excel file (.xlsx) of the Day-out-of-Days matrix.
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;

  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      project: { select: { title: true } },
      shootingDays: {
        orderBy: { sortOrder: "asc" },
        include: {
          sceneStatuses: {
            include: {
              scene: {
                include: {
                  characters: { include: { character: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!schedule) {
    return NextResponse.json({ error: "스케줄을 찾을 수 없습니다" }, { status: 404 });
  }

  const days = schedule.shootingDays;

  // Collect all unique characters
  const characterMap = new Map<string, string>(); // id → name
  for (const day of days) {
    for (const ss of day.sceneStatuses) {
      for (const sc of ss.scene.characters) {
        characterMap.set(sc.character.id, sc.character.name);
      }
    }
  }
  const characters = Array.from(characterMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "ko")
  );

  // Build charId → Set<dayId>
  const charDaySet = new Map<string, Set<string>>();
  for (const day of days) {
    for (const ss of day.sceneStatuses) {
      for (const sc of ss.scene.characters) {
        if (!charDaySet.has(sc.character.id)) charDaySet.set(sc.character.id, new Set());
        charDaySet.get(sc.character.id)!.add(day.id);
      }
    }
  }

  // Build workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "nunionda";
  const sheet = workbook.addWorksheet("Day-out-of-Days");

  // Header row
  const headerRow = ["등장인물", ...days.map((d, i) => `D${i + 1}\n${new Date(d.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}`), "합계"];
  const hRow = sheet.addRow(headerRow);
  hRow.font = { bold: true };
  hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAED" } };
  hRow.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
  hRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(1).height = 36;

  // Data rows
  for (const [charId, charName] of characters) {
    const workDays = charDaySet.get(charId) ?? new Set();
    const cells = [
      charName,
      ...days.map((d) => (workDays.has(d.id) ? "W" : "")),
      workDays.size,
    ];
    const row = sheet.addRow(cells);
    row.alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

    // Color "W" cells blue
    days.forEach((d, i) => {
      if (workDays.has(d.id)) {
        const cell = row.getCell(i + 2);
        cell.font = { bold: true, color: { argb: "FF1E40AF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
      }
    });
  }

  // Column widths
  sheet.getColumn(1).width = 20;
  for (let i = 2; i <= days.length + 1; i++) sheet.getColumn(i).width = 8;
  sheet.getColumn(days.length + 2).width = 8;

  // Add border to all used cells
  const totalRows = characters.length + 1;
  for (let r = 1; r <= totalRows; r++) {
    for (let c = 1; c <= days.length + 2; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `DOOD_${schedule.project.title.replace(/\s+/g, "_")}.xlsx`;
  return new NextResponse(buffer as Buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
