import { describe, it, expect, vi } from "vitest";
import { emitSceneStatusChanged, subscribeToDay } from "@/lib/sse-emitter";

describe("subscribeToDay", () => {
  it("handler is called when emitting for the subscribed day", () => {
    const handler = vi.fn();
    const unsub = subscribeToDay("day-1", handler);

    emitSceneStatusChanged({
      sceneStatusId: "ss-1",
      status: "SHOOTING",
      shootingDayId: "day-1",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      sceneStatusId: "ss-1",
      status: "SHOOTING",
      shootingDayId: "day-1",
    });

    unsub();
  });

  it("handler is NOT called for a different day", () => {
    const handler = vi.fn();
    const unsub = subscribeToDay("day-2", handler);

    emitSceneStatusChanged({
      sceneStatusId: "ss-x",
      status: "COMPLETED",
      shootingDayId: "day-999",
    });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it("unsubscribe stops receiving events", () => {
    const handler = vi.fn();
    const unsub = subscribeToDay("day-3", handler);

    emitSceneStatusChanged({ sceneStatusId: "ss-a", status: "WAITING", shootingDayId: "day-3" });
    unsub();
    emitSceneStatusChanged({ sceneStatusId: "ss-b", status: "COMPLETED", shootingDayId: "day-3" });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("multiple subscribers for the same day all receive the event", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const unsub1 = subscribeToDay("day-4", h1);
    const unsub2 = subscribeToDay("day-4", h2);

    emitSceneStatusChanged({ sceneStatusId: "ss-c", status: "RESHOOT", shootingDayId: "day-4" });

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });

  it("emits multiple events in order", () => {
    const received: string[] = [];
    const unsub = subscribeToDay("day-5", (p) => received.push(p.status));

    emitSceneStatusChanged({ sceneStatusId: "ss-1", status: "SHOOTING", shootingDayId: "day-5" });
    emitSceneStatusChanged({ sceneStatusId: "ss-1", status: "COMPLETED", shootingDayId: "day-5" });

    expect(received).toEqual(["SHOOTING", "COMPLETED"]);
    unsub();
  });
});
