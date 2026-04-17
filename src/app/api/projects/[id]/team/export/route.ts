import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { groupByRole } from "@/lib/team";
import { renderToBuffer } from "@react-pdf/renderer";
import { TeamDirectoryPDF } from "@/components/team-directory-pdf";
import ExcelJS from "exceljs";
import React from "react";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/team/export?format=pdf|excel
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";

  const [project, members] = await Promise.all([
    db.project.findUnique({ where: { id }, select: { title: true } }),
    db.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });

  const groups = groupByRole(members);
  const date = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const slug = project.title.replace(/\s+/g, "-");

  if (format === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("팀 연락망");

    sheet.columns = [
      { header: "부서", key: "dept", width: 16 },
      { header: "이름", key: "name", width: 14 },
      { header: "전화번호", key: "phone", width: 16 },
      { header: "이메일", key: "email", width: 28 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    headerRow.alignment = { vertical: "middle" };
    headerRow.height = 20;

    // Data rows grouped by department
    for (const group of groups) {
      for (const m of group.members) {
        sheet.addRow({
          dept: group.label,
          name: m.user.name,
          phone: m.user.phone ?? "",
          email: m.user.email,
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="team-${slug}-${date}.xlsx"`,
      },
    });
  }

  // Default: PDF
  const buffer = await renderToBuffer(
    React.createElement(TeamDirectoryPDF, { projectTitle: project.title, date, groups })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="team-${slug}-${date}.pdf"`,
    },
  });
}
