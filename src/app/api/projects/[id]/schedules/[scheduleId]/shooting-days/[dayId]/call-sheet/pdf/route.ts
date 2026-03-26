import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { CallSheetPDF } from "@/components/call-sheet-pdf";
import React from "react";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: projectId, scheduleId, dayId } = await params;

  const [day, project] = await Promise.all([
    db.shootingDay.findUnique({
      where: { id: dayId },
      include: {
        schedule: { select: { id: true } },
        sceneStatuses: {
          include: {
            scene: {
              include: { characters: { include: { character: true } } },
            },
          },
          orderBy: { scene: { number: "asc" } },
        },
        callSheets: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    }),
    db.project.findUnique({
      where: { id: projectId },
      select: { title: true },
    }),
  ]);

  if (!day || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Compute D+N
  const allDays = await db.shootingDay.findMany({
    where: { scheduleId },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  const callSheet = day.callSheets[0];

  const scenes = day.sceneStatuses.map((ss) => ({
    number: ss.scene.number,
    intExt: ss.scene.intExt,
    location: ss.scene.location,
    timeOfDay: ss.scene.timeOfDay,
    pageCount: ss.scene.pageCount,
    characters: ss.scene.characters.map((sc) => sc.character.name),
  }));

  const cast = callSheet?.cast
    ? (callSheet.cast as Array<{ name: string; callTime: string; makeupTime?: string; standbyLocation?: string }>)
    : scenes
        .flatMap((s) => s.characters)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((name) => ({ name, callTime: day.callTime || "" }));

  const pdfElement = React.createElement(CallSheetPDF, {
    projectTitle: project.title,
    dayNumber,
    date: day.date.toISOString().split("T")[0],
    location: day.location || "",
    callTime: callSheet?.callTime || day.callTime || "",
    shootTime: day.shootTime || "",
    scenes,
    cast,
    crew: (callSheet?.crew as Array<{ department: string; name: string; callTime: string }>) || [],
    equipment: (callSheet?.equipment as Array<{ name: string; status?: string }>) || [],
    meals: (callSheet?.meals as Array<{ time: string; menu: string; location: string }>) || [],
    notes: callSheet?.notes,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfElement as any);

  const filename = `callsheet_D${dayNumber}_${day.date.toISOString().split("T")[0]}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
