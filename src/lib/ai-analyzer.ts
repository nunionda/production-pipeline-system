/**
 * AI 시나리오 분석 모듈
 *
 * 멀티 LLM 지원: Gemini → Claude → OpenAI (우선순위)
 * 한국어 시나리오에서 씬, 등장인물, 소품, 의상, 로케이션, VFX를 추출합니다.
 *
 * 청크 전략: 10-15씬 단위로 분할 → 병렬 분석 → 결과 병합
 */

// Using fetch instead of SDK for reliability

export interface AnalyzedScene {
  number: number;
  intExt: "INT" | "EXT" | "INT_EXT";
  location: string;
  timeOfDay: "D" | "N" | "DN" | "ND";
  description: string;
  characters: { name: string; description?: string; action?: string }[];
  props: { name: string; usage?: string }[];
  costumes: { character: string; description: string }[];
  locations: { name: string; features?: string[] }[];
  vfx?: { description: string; complexity?: "LOW" | "MEDIUM" | "HIGH" }[];
}

export interface AnalysisResult {
  scenes: AnalyzedScene[];
  summary: {
    totalScenes: number;
    totalCharacters: number;
    totalProps: number;
    totalLocations: number;
  };
  provider: string;
}

const SYSTEM_PROMPT = `당신은 한국어 시나리오 분석 전문가입니다.
주어진 시나리오 텍스트에서 다음 정보를 정확하게 추출하세요:

1. 씬 (Scene): 번호, 실내/실외(INT/EXT), 장소, 시간대(D/N/DN/ND), 설명
2. 등장인물 (Character): 이름, 설명, 씬에서의 행동
3. 소품 (Prop): 이름, 사용 맥락
4. 의상 (Costume): 캐릭터, 의상 설명
5. 로케이션 (Location): 장소명, 특징
6. VFX: 특수효과 설명, 복잡도

한국어 시나리오 규칙:
- 씬 번호: S#1, #1, 씬1, 신1 등 다양한 형식
- 시간대: 낮=D, 밤=N, 저녁=D/N(DN), 새벽=N/D(ND)
- 실내=INT, 실외=EXT, 겸용=INT_EXT
- 지문(액션 라인)에서 소품/의상을 추출
- 대사에서는 직접 언급된 물건만 추출

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{
  "scenes": [
    {
      "number": 1,
      "intExt": "INT",
      "location": "장소명",
      "timeOfDay": "D",
      "description": "씬 설명",
      "characters": [{"name": "이름", "description": "설명", "action": "행동"}],
      "props": [{"name": "소품명", "usage": "사용 맥락"}],
      "costumes": [{"character": "캐릭터", "description": "의상 설명"}],
      "locations": [{"name": "장소명", "features": ["특징1"]}],
      "vfx": []
    }
  ]
}

추출 확신도가 낮은 항목에는 "confidence": "low"를 추가하세요.`;

const USER_PROMPT_PREFIX = "다음 한국어 시나리오를 분석하세요:\n\n";

// ──────────────────────────────────────────────
// LLM Provider Selection
// ──────────────────────────────────────────────

type Provider = "gemini" | "anthropic" | "openai";

function selectProvider(): { provider: Provider; apiKey: string } {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) return { provider: "gemini", apiKey: geminiKey };
  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };

  throw new Error(
    "AI API 키가 설정되지 않았습니다. GEMINI_API_KEY, ANTHROPIC_API_KEY, 또는 OPENAI_API_KEY 중 하나를 .env에 설정하세요."
  );
}

// ──────────────────────────────────────────────
// Chunk Splitting
// ──────────────────────────────────────────────

/**
 * 시나리오 텍스트를 청크로 분할합니다.
 * 씬 경계를 기준으로 10-15씬씩 분할.
 */
export function splitIntoChunks(text: string, chunkSize = 12): string[] {
  // Non-zero-width pattern: anchored newline prefix. A lookahead-only regex
  // with the /g flag never advances lastIndex, producing an infinite loop
  // that grows `boundaries` until V8 throws RangeError: Invalid array length.
  const scenePattern = /(?:^|\n)(?:S#\d+|#\d+\.|씬\s*\d+|신\s*\d+)/g;
  const boundaries: number[] = [0];

  for (const m of text.matchAll(scenePattern)) {
    const idx = text.charAt(m.index!) === "\n" ? m.index! + 1 : m.index!;
    if (idx > boundaries[boundaries.length - 1]!) boundaries.push(idx);
  }

  if (boundaries.length <= 1) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < boundaries.length; i += chunkSize) {
    const start = boundaries[i]!;
    const end =
      i + chunkSize < boundaries.length
        ? boundaries[i + chunkSize]!
        : text.length;
    chunks.push(text.slice(start, end));
  }

  return chunks;
}

// ──────────────────────────────────────────────
// Provider-specific Analysis
// ──────────────────────────────────────────────

async function analyzeWithGemini(
  chunkText: string,
  apiKey: string
): Promise<AnalyzedScene[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + "\n\n" + USER_PROMPT_PREFIX + chunkText },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini API returned empty response");

  return parseAIResponse(text);
}

async function analyzeWithAnthropic(
  chunkText: string,
  apiKey: string
): Promise<AnalyzedScene[]> {
  // Dynamic import to avoid requiring the package when not used
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: USER_PROMPT_PREFIX + chunkText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Anthropic API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Anthropic API returned empty response");

  return parseAIResponse(text);
}

async function analyzeWithOpenAI(
  chunkText: string,
  apiKey: string
): Promise<AnalyzedScene[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT_PREFIX + chunkText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI API returned empty response");

  return parseAIResponse(text);
}

// ──────────────────────────────────────────────
// Response Parsing
// ──────────────────────────────────────────────

function parseAIResponse(responseText: string): AnalyzedScene[] {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr);
  const scenes: AnalyzedScene[] = parsed.scenes || parsed;

  // Validate basic structure
  if (!Array.isArray(scenes)) {
    throw new Error("AI 응답이 예상 형식과 다릅니다 (scenes 배열 없음)");
  }

  return scenes.map((scene) => ({
    number: scene.number ?? 0,
    intExt: normalizeIntExt(scene.intExt),
    location: scene.location ?? "",
    timeOfDay: normalizeTimeOfDay(scene.timeOfDay),
    description: scene.description ?? "",
    characters: scene.characters ?? [],
    props: scene.props ?? [],
    costumes: scene.costumes ?? [],
    locations: scene.locations ?? [],
    vfx: scene.vfx ?? [],
  }));
}

function normalizeIntExt(value: string): "INT" | "EXT" | "INT_EXT" {
  const v = (value || "").toUpperCase().replace(/[^A-Z_]/g, "");
  if (v.includes("INT") && v.includes("EXT")) return "INT_EXT";
  if (v.includes("EXT")) return "EXT";
  return "INT";
}

function normalizeTimeOfDay(value: string): "D" | "N" | "DN" | "ND" {
  const v = (value || "").toUpperCase();
  if (v === "DN" || v === "D/N" || v.includes("저녁")) return "DN";
  if (v === "ND" || v === "N/D" || v.includes("새벽")) return "ND";
  if (v === "N" || v.includes("밤")) return "N";
  return "D";
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * 시나리오 청크를 분석합니다.
 * 사용 가능한 LLM을 자동 선택합니다.
 */
export async function analyzeChunk(
  chunkText: string,
  chunkIndex: number,
  overrideApiKey?: string
): Promise<AnalyzedScene[]> {
  const { provider, apiKey } = overrideApiKey
    ? { provider: "gemini" as Provider, apiKey: overrideApiKey }
    : selectProvider();

  console.log(`[AI] Chunk ${chunkIndex} → ${provider}`);

  switch (provider) {
    case "gemini":
      return analyzeWithGemini(chunkText, apiKey);
    case "anthropic":
      return analyzeWithAnthropic(chunkText, apiKey);
    case "openai":
      return analyzeWithOpenAI(chunkText, apiKey);
  }
}

/**
 * 전체 시나리오를 분석합니다.
 * 청크 분할 → 병렬 분석 → 결과 병합
 */
export async function analyzeScript(text: string): Promise<AnalysisResult> {
  const { provider } = selectProvider();
  const chunks = splitIntoChunks(text);

  console.log(`[AI] Script analysis: ${chunks.length} chunks, provider: ${provider}`);

  // 병렬 분석 (최대 3개 동시)
  const results: AnalyzedScene[][] = [];
  const concurrency = 3;

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((chunk, j) => analyzeChunk(chunk, i + j))
    );
    results.push(...batchResults);
  }

  const merged = mergeResults(results);
  return { ...merged, provider };
}

/**
 * 여러 청크의 분석 결과를 병합합니다.
 */
export function mergeResults(chunkResults: AnalyzedScene[][]): Omit<AnalysisResult, "provider"> {
  const allScenes = chunkResults.flat().sort((a, b) => a.number - b.number);

  const uniqueScenes = new Map<number, AnalyzedScene>();
  for (const scene of allScenes) {
    if (!uniqueScenes.has(scene.number)) {
      uniqueScenes.set(scene.number, scene);
    }
  }

  const scenes = Array.from(uniqueScenes.values());

  const characterNames = new Set<string>();
  const propNames = new Set<string>();
  const locationNames = new Set<string>();

  for (const scene of scenes) {
    scene.characters.forEach((c) => characterNames.add(c.name));
    scene.props.forEach((p) => propNames.add(p.name));
    scene.locations.forEach((l) => locationNames.add(l.name));
  }

  return {
    scenes,
    summary: {
      totalScenes: scenes.length,
      totalCharacters: characterNames.size,
      totalProps: propNames.size,
      totalLocations: locationNames.size,
    },
  };
}

export { SYSTEM_PROMPT };
