/**
 * 시나리오 파일 파싱 모듈
 *
 * 지원 형식:
 * - .docx (mammoth.js)
 * - .txt (plain text)
 * - .hwp (향후 hwp.js — 현재 fallback: .docx 변환 요구)
 */

import mammoth from "mammoth";

export interface ParsedScript {
  text: string;
  format: "docx" | "txt" | "hwp";
  pageCount?: number;
}

/**
 * 파일 Buffer에서 텍스트를 추출합니다.
 */
export async function parseScriptFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedScript> {
  const ext = filename.toLowerCase().split(".").pop();

  switch (ext) {
    case "docx":
      return parseDocx(buffer);
    case "txt":
      return parseTxt(buffer);
    case "hwp":
      return parseHwp(buffer, filename);
    default:
      throw new ScriptParseError(
        `지원하지 않는 파일 형식입니다: .${ext}\n지원 형식: .docx, .txt, .hwp`
      );
  }
}

async function parseDocx(buffer: Buffer): Promise<ParsedScript> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value?.trim()) {
      throw new ScriptParseError("파일에서 텍스트를 추출할 수 없습니다");
    }
    return {
      text: result.value,
      format: "docx",
    };
  } catch (error) {
    if (error instanceof ScriptParseError) throw error;
    throw new ScriptParseError(
      `DOCX 파일을 읽을 수 없습니다: ${(error as Error).message}`
    );
  }
}

async function parseTxt(buffer: Buffer): Promise<ParsedScript> {
  const text = buffer.toString("utf-8");
  if (!text.trim()) {
    throw new ScriptParseError("파일이 비어 있습니다");
  }
  return { text, format: "txt" };
}

async function parseHwp(
  _buffer: Buffer,
  filename: string
): Promise<ParsedScript> {
  // TODO: Sprint 1에서 hwp.js 통합
  // Fallback: .docx 변환 요구
  throw new ScriptParseError(
    `.hwp 파일은 아직 지원 준비 중입니다.\n"${filename}"을 .docx로 변환하여 다시 업로드해 주세요.\n\n한글에서 [파일 > 다른 이름으로 저장] → Microsoft Word(.docx) 선택`
  );
}

export class ScriptParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScriptParseError";
  }
}

/**
 * 시나리오 텍스트에서 기본 씬 경계를 감지합니다.
 * AI 분석 전에 대략적인 씬 수를 파악하는 용도.
 *
 * 한국어 시나리오 씬 헤더 패턴:
 * - S#1. 장소 (시간)
 * - S#1 장소 (시간)
 * - #1. 장소 (시간)
 * - 씬1. 장소
 * - 신1. 장소
 */
export function detectSceneBoundaries(text: string): number {
  const scenePatterns = [
    /^S#\d+/gm, // S#1, S#12
    /^#\d+\./gm, // #1.
    /^씬\s*\d+/gm, // 씬1, 씬 1
    /^신\s*\d+/gm, // 신1, 신 1
    /^SCENE\s*\d+/gim, // SCENE 1
  ];

  let maxCount = 0;
  for (const pattern of scenePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > maxCount) {
      maxCount = matches.length;
    }
  }
  return maxCount;
}
