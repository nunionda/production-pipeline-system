"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function NewSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("메인 스케줄");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { id } = await params;
      const res = await fetch(`/api/projects/${id}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("실패");
      const schedule = await res.json();
      router.push(`/projects/${id}/schedule/${schedule.id}`);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-md">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">스케줄 생성</h2>
        <p className="text-sm text-gray-500 mt-1">
          촬영 스케줄을 만들고 촬영일을 추가하세요
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            스케줄 이름
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="메인 스케줄"
            required
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "생성 중..." : "스케줄 생성"}
          </button>
          <Link
            href="../schedule"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 text-center transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
