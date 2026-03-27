import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { CallSheetPDF } from "@/components/call-sheet-pdf";
import {
  sendMessage,
  sendDocument,
  buildCallsheetMessage,
  buildDmMessage,
} from "@/lib/telegram";

// GET /api/cron/telegram-callsheet
// Called daily at UTC 10:00 (KST 19:00) by Vercel Cron.
// Sends callsheets for tomorrow's shooting days across all projects.
export async function GET(req: NextRequest) {
  // Verify cron secret — fail closed (reject if not configured)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/telegram-callsheet] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Compute tomorrow's date range (UTC midnight to midnight)
  const now = new Date();
  const tomorrowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const tomorrowEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
  );

  // Query all shooting days for tomorrow that have a telegram group and at least one callsheet
  const days = await db.shootingDay.findMany({
    where: {
      date: { gte: tomorrowStart, lt: tomorrowEnd },
      project: { telegramChatId: { not: null } },
      callSheets: { some: {} },
    },
    include: {
      project: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, telegramChatId: true },
              },
            },
          },
        },
      },
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // dayNumber 계산을 위해 관련 스케줄의 모든 촬영일을 미리 조회
  const scheduleIds = [...new Set(days.map((d) => d.scheduleId))];
  const schedulesDays = await db.shootingDay.findMany({
    where: { scheduleId: { in: scheduleIds } },
    orderBy: { date: "asc" },
    select: { id: true, scheduleId: true },
  });
  // scheduleId → ordered dayIds map
  const scheduleDayMap = new Map<string, string[]>();
  for (const d of schedulesDays) {
    const arr = scheduleDayMap.get(d.scheduleId) ?? [];
    arr.push(d.id);
    scheduleDayMap.set(d.scheduleId, arr);
  }

  type DayResult = { dayId: string; ok: boolean; error?: string };
  const results: DayResult[] = [];

  for (const day of days) {
    const { project } = day;

    try {
      // project.telegramChatId is guaranteed non-null by the query filter
      const chatId = project.telegramChatId!;

      // Compute day number within the schedule
      const dayIds = scheduleDayMap.get(day.scheduleId) ?? [];
      const dayNumber = dayIds.findIndex((id) => id === day.id) + 1;

      // Build share URL — reuse existing non-expired share if available
      let shareUrl = `${appUrl}/projects/${project.id}/schedule/${day.scheduleId}/day/${day.id}`;

      if (day.callSheets[0]) {
        const existingShare = await db.callSheetShare.findFirst({
          where: {
            shootingDayId: day.id,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        const share =
          existingShare ??
          (await db.callSheetShare.create({
            data: {
              callSheetId: day.callSheets[0].id,
              shootingDayId: day.id,
              expiresAt: new Date(day.date.getTime() + 24 * 60 * 60 * 1000),
            },
          }));
        shareUrl = `${appUrl}/c/${share.token}`;
      }

      // Send group message
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
      await sendMessage(chatId, groupMessage);

      // Send PDF if callsheet exists
      if (day.callSheets[0]) {
        try {
          const callSheet = day.callSheets[0];

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
            chatId,
            Buffer.from(pdfBuffer),
            `D+${dayNumber}_콜시트.pdf`,
            `${project.title} D+${dayNumber} 콜시트`
          );
        } catch (pdfErr) {
          console.error("[cron/telegram-callsheet] PDF 생성 실패:", pdfErr);
          // PDF failure is non-fatal — group message was already sent
        }
      }

      // Send DMs to team members with telegramChatId
      await Promise.allSettled(
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

      results.push({ dayId: day.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/telegram-callsheet] dayId=${day.id} 실패:`, err);
      results.push({ dayId: day.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
