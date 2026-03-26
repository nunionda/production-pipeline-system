import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// GET /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/call-sheet
export async function GET(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const callSheet = await db.callSheet.findFirst({
    where: { shootingDayId: dayId },
    orderBy: { updatedAt: "desc" },
  });
  if (!callSheet) return NextResponse.json(null);
  return NextResponse.json(callSheet);
}

// POST /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/call-sheet
// Auto-generate or manually create a call sheet
export async function POST(request: NextRequest, { params }: Params) {
  const { dayId, id: projectId } = await params;
  const body = await request.json().catch(() => ({}));

  // Fetch shooting day with all related data
  const day = await db.shootingDay.findUnique({
    where: { id: dayId },
    include: {
      sceneStatuses: {
        include: {
          scene: {
            include: {
              characters: { include: { character: true } },
              props: { include: { prop: true } },
              costumes: { include: { costume: true } },
              locations: { include: { location: true } },
            },
          },
        },
        orderBy: { scene: { number: "asc" } },
      },
    },
  });

  if (!day) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch project info
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { title: true, format: true },
  });

  // Auto-build scenes list from sceneStatuses
  const scenesList = day.sceneStatuses.map((ss) => ({
    sceneId: ss.sceneId,
    number: ss.scene.number,
    intExt: ss.scene.intExt,
    location: ss.scene.location,
    timeOfDay: ss.scene.timeOfDay,
    pageCount: ss.scene.pageCount,
    characters: ss.scene.characters.map((sc) => sc.character.name),
  }));

  // Collect unique cast from all scenes
  const castSet = new Map<string, string>();
  day.sceneStatuses.forEach((ss) => {
    ss.scene.characters.forEach((sc) => {
      castSet.set(sc.character.id, sc.character.name);
    });
  });
  const castList = Array.from(castSet.entries()).map(([id, name]) => ({
    characterId: id,
    name,
    callTime: day.callTime || "",
    makeupTime: "",
    standbyLocation: "",
  }));

  // Collect unique props/costumes
  const propsList = day.sceneStatuses.flatMap((ss) =>
    ss.scene.props.map((sp) => ({ name: sp.prop.name, status: sp.prop.status }))
  );

  const callSheet = await db.callSheet.create({
    data: {
      shootingDayId: dayId,
      callTime: body.callTime || day.callTime || "06:00",
      scenes: scenesList,
      cast: castList,
      crew: body.crew || [],
      equipment: body.equipment || propsList,
      meals: body.meals || [],
      notes: body.notes || null,
    },
  });

  return NextResponse.json(callSheet, { status: 201 });
}

// PUT /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/call-sheet
export async function PUT(request: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const body = await request.json();

  const existing = await db.callSheet.findFirst({ where: { shootingDayId: dayId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const callSheet = await db.callSheet.update({
    where: { id: existing.id },
    data: {
      ...(body.callTime !== undefined && { callTime: body.callTime }),
      ...(body.scenes !== undefined && { scenes: body.scenes }),
      ...(body.cast !== undefined && { cast: body.cast }),
      ...(body.crew !== undefined && { crew: body.crew }),
      ...(body.equipment !== undefined && { equipment: body.equipment }),
      ...(body.meals !== undefined && { meals: body.meals }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(callSheet);
}
