"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SceneData {
  id: string;
  number: number;
  intExt: string;
  location: string;
  timeOfDay: string;
  description: string;
  characters: { name: string; description?: string; action?: string }[];
  props: { name: string; usage?: string }[];
  costumes: { character: string; description: string }[];
  locations: { name: string }[];
}

interface AnalysisReviewClientProps {
  projectId: string;
  scriptId: string;
  parsedText: string;
  scenes: SceneData[];
  analysisStatus: string;
}

const timeOfDayLabel: Record<string, string> = {
  D: "낮",
  N: "밤",
  DN: "저녁",
  ND: "새벽",
};

export function AnalysisReviewClient({
  projectId,
  scriptId,
  parsedText,
  scenes,
  analysisStatus,
}: AnalysisReviewClientProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [selectedScene, setSelectedScene] = useState<number>(
    scenes.length > 0 ? scenes[0].number : 0
  );

  async function startAnalysis() {
    setAnalyzing(true);
    setError("");

    try {
      const res = await fetch(
        `/api/projects/${projectId}/scripts/${scriptId}/analyze`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "분석에 실패했습니다");
        setAnalyzing(false);
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setAnalyzing(false);
    }
  }

  const currentScene = scenes.find((s) => s.number === selectedScene);

  // Before analysis: show prompt to start
  if (analysisStatus === "PENDING" || analysisStatus === "FAILED") {
    return (
      <div className="mt-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <span className="text-4xl">🤖</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {analysisStatus === "FAILED"
              ? "분석 실패 — 다시 시도하시겠습니까?"
              : "시나리오를 AI로 분석할 준비가 되었습니다"}
          </h3>
          <p className="mt-2 text-sm text-gray-500 text-center max-w-md">
            AI가 시나리오에서 씬, 등장인물, 소품, 의상, 로케이션을 자동으로
            추출합니다. 결과를 검토하고 수정할 수 있습니다.
          </p>
          <button
            onClick={startAnalysis}
            disabled={analyzing}
            className="mt-6 rounded-md bg-primary-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {analyzing ? "분석 중..." : "AI 분석 시작"}
          </button>
        </div>
      </div>
    );
  }

  // During analysis: show loading
  if (analysisStatus === "PROCESSING") {
    return (
      <div className="mt-8 flex flex-col items-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-800 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600">시나리오 분석 중...</p>
        <p className="mt-1 text-xs text-gray-400">
          씬 구조, 등장인물, 소품을 추출하고 있습니다
        </p>
      </div>
    );
  }

  // After analysis: show "Magic Trick" parallel view
  if (scenes.length === 0) {
    return (
      <div className="mt-8 text-center text-sm text-gray-500">
        분석 결과가 없습니다
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Scene navigator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {scenes.map((scene) => (
          <button
            key={scene.number}
            onClick={() => setSelectedScene(scene.number)}
            className={`flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedScene === scene.number
                ? "bg-primary-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            S#{scene.number}
          </button>
        ))}
      </div>

      {/* Parallel view */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Original script text */}
        <div className="rounded-lg border border-gray-200 bg-surface">
          <div className="border-b border-gray-200 px-4 py-2.5">
            <h3 className="text-sm font-medium text-gray-700">원본 시나리오</h3>
          </div>
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
              {extractSceneText(parsedText, selectedScene)}
            </pre>
          </div>
        </div>

        {/* Right: Extracted data */}
        <div className="rounded-lg border border-gray-200 bg-surface">
          <div className="border-b border-gray-200 px-4 py-2.5">
            <h3 className="text-sm font-medium text-gray-700">
              AI 추출 결과
            </h3>
          </div>
          {currentScene ? (
            <div className="p-4 space-y-4">
              {/* Scene header */}
              <div className="rounded-md bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-gray-900">
                    S#{currentScene.number}
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                    {currentScene.intExt}
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                    {timeOfDayLabel[currentScene.timeOfDay] || currentScene.timeOfDay}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  {currentScene.location}
                </p>
                {currentScene.description && (
                  <p className="mt-1 text-xs text-gray-500">
                    {currentScene.description}
                  </p>
                )}
              </div>

              {/* Characters */}
              {currentScene.characters.length > 0 && (
                <Section title="등장인물" count={currentScene.characters.length}>
                  {currentScene.characters.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-medium text-gray-900">
                        {c.name}
                      </span>
                      {c.description && (
                        <span className="text-gray-500">({c.description})</span>
                      )}
                      {c.action && (
                        <span className="text-gray-400">— {c.action}</span>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* Props */}
              {currentScene.props.length > 0 && (
                <Section title="소품" count={currentScene.props.length}>
                  {currentScene.props.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-gray-900">{p.name}</span>
                      {p.usage && (
                        <span className="text-gray-400">— {p.usage}</span>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* Costumes */}
              {currentScene.costumes.length > 0 && (
                <Section title="의상" count={currentScene.costumes.length}>
                  {currentScene.costumes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {c.character}
                      </span>
                      <span className="text-gray-500">{c.description}</span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Locations */}
              {currentScene.locations.length > 0 && (
                <Section title="로케이션" count={currentScene.locations.length}>
                  {currentScene.locations.map((l, i) => (
                    <div key={i} className="text-gray-900">
                      {l.name}
                    </div>
                  ))}
                </Section>
              )}
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-500">씬을 선택하세요</div>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="mt-6 flex items-center gap-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        <span>
          전체 <strong className="text-gray-900">{scenes.length}</strong>개 씬
        </span>
        <span>
          등장인물{" "}
          <strong className="text-gray-900">
            {new Set(scenes.flatMap((s) => s.characters.map((c) => c.name))).size}
          </strong>
          명
        </span>
        <span>
          소품{" "}
          <strong className="text-gray-900">
            {new Set(scenes.flatMap((s) => s.props.map((p) => p.name))).size}
          </strong>
          개
        </span>
        <span>
          로케이션{" "}
          <strong className="text-gray-900">
            {new Set(scenes.flatMap((s) => s.locations.map((l) => l.name))).size}
          </strong>
          곳
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {title} ({count})
      </h4>
      <div className="mt-1.5 space-y-1 text-sm">{children}</div>
    </div>
  );
}

/**
 * 원본 텍스트에서 특정 씬 번호에 해당하는 부분을 추출합니다.
 */
function extractSceneText(fullText: string, sceneNumber: number): string {
  if (!fullText) return "(시나리오 텍스트 없음)";

  // 씬 시작 패턴
  const patterns = [
    new RegExp(`(S#${sceneNumber}[.\\s])`, "g"),
    new RegExp(`(#${sceneNumber}[.\\s])`, "g"),
    new RegExp(`(씬\\s*${sceneNumber}[.\\s])`, "g"),
    new RegExp(`(신\\s*${sceneNumber}[.\\s])`, "g"),
  ];

  let startIdx = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(fullText);
    if (match) {
      startIdx = match.index;
      break;
    }
  }

  if (startIdx === -1) {
    return `(S#${sceneNumber} 텍스트를 찾을 수 없습니다)`;
  }

  // 다음 씬 시작 찾기
  const nextScenePattern =
    /(?:^|\n)(?:S#\d+|#\d+\.|씬\s*\d+|신\s*\d+)/g;
  nextScenePattern.lastIndex = startIdx + 1;
  const nextMatch = nextScenePattern.exec(fullText);
  const endIdx = nextMatch ? nextMatch.index : fullText.length;

  return fullText.slice(startIdx, endIdx).trim();
}
