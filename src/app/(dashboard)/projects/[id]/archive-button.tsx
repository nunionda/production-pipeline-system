"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveButton({ projectId, isCompleted }: { projectId: string; isCompleted: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: isCompleted ? "DELIVERY" : "COMPLETED" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        isCompleted
          ? "border-gray-300 text-gray-700 hover:bg-gray-50"
          : "border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {loading ? "처리 중..." : isCompleted ? "아카이브 해제" : "프로젝트 아카이브"}
    </button>
  );
}
