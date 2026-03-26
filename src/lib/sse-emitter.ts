/**
 * Process-global SSE event emitter.
 *
 * IMPORTANT: Works only with Docker + `next start` (single persistent process).
 * For multi-instance deployments, replace with Redis Pub/Sub — see TODOS.md.
 *
 * Event: "scene-status-changed"
 * Payload: { sceneStatusId: string; status: string; shootingDayId: string }
 */

import { EventEmitter } from "events";

// Use a module-level singleton so the same instance is shared across all
// imports within a single process. The `global` trick isn't needed in Next.js
// App Router (Node runtime) because the module cache is shared.
const emitter = new EventEmitter();
emitter.setMaxListeners(200); // support up to 200 concurrent SSE clients

export type SceneStatusChangedPayload = {
  sceneStatusId: string;
  status: string;
  shootingDayId: string;
};

/**
 * Emit a scene-status-changed event for a specific shooting day.
 * Call this after any scene status update.
 */
export function emitSceneStatusChanged(payload: SceneStatusChangedPayload) {
  emitter.emit(`day:${payload.shootingDayId}`, payload);
}

/**
 * Subscribe to scene-status-changed events for a shooting day.
 * Returns an unsubscribe function.
 */
export function subscribeToDay(
  dayId: string,
  handler: (payload: SceneStatusChangedPayload) => void
): () => void {
  const event = `day:${dayId}`;
  emitter.on(event, handler);
  return () => emitter.off(event, handler);
}
