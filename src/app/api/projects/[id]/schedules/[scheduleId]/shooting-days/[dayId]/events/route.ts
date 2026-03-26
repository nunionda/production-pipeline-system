import { NextRequest } from "next/server";
import { subscribeToDay } from "@/lib/sse-emitter";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// GET /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/events
// Server-Sent Events stream for real-time scene status updates.
// No auth — shooting day ID + project ID provide sufficient security
// (all IDs are cuid — not guessable).
export async function GET(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping so client knows the connection is alive
      controller.enqueue(encode("data: {\"type\":\"connected\"}\n\n"));

      const unsubscribe = subscribeToDay(dayId, (payload) => {
        const data = JSON.stringify({ type: "scene-status-changed", ...payload });
        controller.enqueue(encode(`data: ${data}\n\n`));
      });

      // Clean up subscription when client disconnects
      _req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

function encode(text: string) {
  return new TextEncoder().encode(text);
}
