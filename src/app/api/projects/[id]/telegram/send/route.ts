import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { CallSheetPDF } from "@/components/call-sheet-pdf";
import {
  sendMessage,
  sendDocument,
  buildCallsheetMessage,
  buildDmMessage,
} from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/telegram/send
// Body: { dayId: string, scheduleId: string }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { dayId, scheduleId } = (await req.json()) as {
    dayId: string;
    scheduleId: string;
  };

  if (!dayId || !scheduleId) {
    return NextResponse.json({ error: "dayId, scheduleId 필수" }, { status: 400 });
  }

  // 프로젝트 + 팀원 조회
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, telegramChatId: true },
          },
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  if (!project.telegramChatId) {
    return NextResponse.json(
      { error: "텔레그램 그룹이 연결되지 않았습니다" },
      { status: 400 }
    );
  }

  // 촬영일 + 씬 조회
  const day = await db.shootingDay.findUnique({
    where: { id: dayId },
    include: {
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
  });
  if (!day) return NextResponse.json({ error: "촬영일 없음" }, { status: 404 });

  // 촬영일 번호 계산 (스케줄 내 날짜 순서)
  const allDays = await db.shootingDay.findMany({
    where: { scheduleId: day.scheduleId },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  // 공유 링크 생성 또는 재사용
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let shareUrl = `${appUrl}/projects/${projectId}/schedule/${scheduleId}/day/${dayId}`;

  if (day.callSheets[0]) {
    const existingShare = await db.callSheetShare.findFirst({
      where: {
        shootingDayId: dayId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    const share =
      existingShare ??
      (await db.callSheetShare.create({
        data: {
          callSheetId: day.callSheets[0].id,
          shootingDayId: dayId,
          expiresAt: new Date(day.date.getTime() + 24 * 60 * 60 * 1000),
        },
      }));
    shareUrl = `${appUrl}/c/${share.token}`;
  }

  // 그룹 메시지 발송
  const sceneNumbers = day.sceneStatuses.map((s) => s.scene.number);
  const groupMessage = buildCallsheetMessage({
    projectTitle: project.title,
    dayNumber,
    date: day.date,
    location: day.location,
    callTime: day.callTime,
    shootTime: day.shootTime,
    sceneNumbers,
    shareUrl,
  });
  await sendMessage(project.telegramChatId, groupMessage);

  // PDF 발송
  if (day.callSheets[0]) {
    try {
      const callSheet = day.callSheets[0];

      // CallSheetPDF expects flat props — map DB data accordingly
      const scenes = day.sceneStatuses.map((ss) => ({
        number: ss.scene.number,
        intExt: ss.scene.intExt,
        location: ss.scene.location,
        timeOfDay: ss.scene.timeOfDay,
        pageCount: ss.scene.pageCount,
        characters: ss.scene.characters.map((sc) => sc.character.name),
      }));

      const cast = Array.isArray(callSheet.cast)
        ? (callSheet.cast as Array<{
            name: string;
            callTime: string;
            makeupTime?: string;
            standbyLocation?: string;
          }>)
        : [];

      const crew = Array.isArray(callSheet.crew)
        ? (callSheet.crew as Array<{
            department: string;
            name: string;
            callTime: string;
          }>)
        : [];

      const equipment = Array.isArray(callSheet.equipment)
        ? (callSheet.equipment as Array<{ name: string; status?: string }>)
        : [];

      const meals = Array.isArray(callSheet.meals)
        ? (callSheet.meals as Array<{
            time: string;
            menu: string;
            location: string;
          }>)
        : [];

      // date needs to be YYYY-MM-DD string for the component
      const dateStr = day.date.toISOString().slice(0, 10);

      const pdfBuffer = await renderToBuffer(
        React.createElement(CallSheetPDF, {
          projectTitle: project.title,
          dayNumber,
          date: dateStr,
          location: day.location ?? "",
          callTime: callSheet.callTime,
          shootTime: day.shootTime ?? "",
          scenes,
          cast,
          crew,
          equipment,
          meals,
          notes: callSheet.notes,
        })
      );
      await sendDocument(
        project.telegramChatId,
        Buffer.from(pdfBuffer),
        `D+${dayNumber}_콜시트.pdf`,
        `${project.title} D+${dayNumber} 콜시트`
      );
    } catch (err) {
      console.error("[telegram/send] PDF 생성 실패:", err);
    }
  }

  // 개인 DM 발송 (telegramChatId 있는 팀원만)
  const dmResults = await Promise.allSettled(
    project.members
      .filter((m) => m.user.telegramChatId)
      .map((m) =>
        sendMessage(
          m.user.telegramChatId!,
          buildDmMessage({
            memberName: m.user.name,
            date: day.date,
            shareUrl,
          })
        )
      )
  );

  const dmSent = dmResults.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;

  return NextResponse.json({ ok: true, dmSent });
}
