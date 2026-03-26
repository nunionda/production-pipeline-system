/**
 * AI Spike Test — Gemini로 한국어 시나리오 분석 테스트
 */
import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not found");
  process.exit(1);
}

const SYSTEM_PROMPT = `당신은 한국어 시나리오 분석 전문가입니다. 주어진 시나리오에서 씬(Scene), 등장인물(Character), 소품(Prop), 의상(Costume), 로케이션(Location)을 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{"scenes":[{"number":1,"intExt":"INT","location":"장소","timeOfDay":"D","description":"설명","characters":[{"name":"이름","description":"설명","action":"행동"}],"props":[{"name":"소품","usage":"맥락"}],"costumes":[{"character":"캐릭터","description":"의상"}],"locations":[{"name":"장소","features":["특징"]}]}]}`;

const TEST_SCRIPT = `
S#1. 수진의 아파트 거실 (낮)

수진(30대, 단정한 셔츠)이 소파에 앉아 노트북을 보고 있다.
테이블 위에 커피잔과 서류 뭉치가 놓여 있다.
현관문이 열리고 민호(40대, 정장)가 들어온다.

민호: 회의 끝났어. 결과 어때?
수진: (노트북을 돌려 보여주며) 직접 봐.

S#2. 카페 (밤)

민호가 창가 자리에 앉아 아메리카노를 마시고 있다.
테이블 위에 핸드폰과 차 키가 놓여 있다.
수진이 들어와서 맞은편에 앉는다.

수진: 오래 기다렸어?
민호: 아니, 방금 왔어.

S#3. 한강 공원 산책로 (저녁)

수진과 민호가 나란히 걷고 있다. 석양이 한강에 비친다.
수진은 가디건을 걸치고 있고, 민호는 넥타이를 풀었다.

S#4. 수진의 아파트 현관 (밤)

수진이 현관문을 열고 들어온다.
신발장 위에 열쇠와 우편물이 놓여 있다.
수진이 코트를 벗어 옷걸이에 건다.
`;

async function main() {
  console.log("=== AI Spike Test (Gemini) ===");
  const start = Date.now();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  console.log("Calling Gemini API...");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n다음 시나리오를 분석하세요:\n\n" + TEST_SCRIPT }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  console.log("Status:", res.status);
  if (!res.ok) {
    console.error("Error:", await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\nResponse received in ${elapsed}s`);

  const result = JSON.parse(text);
  const scenes = result.scenes;

  console.log(`\n✅ ${scenes.length}개 씬 분석 완료`);

  for (const scene of scenes) {
    console.log(`  S#${scene.number} ${scene.intExt} ${scene.location} (${scene.timeOfDay})`);
    console.log(`    인물: ${scene.characters?.map((c: {name: string}) => c.name).join(", ") || "-"}`);
    console.log(`    소품: ${scene.props?.map((p: {name: string}) => p.name).join(", ") || "-"}`);
    console.log(`    의상: ${scene.costumes?.map((c: {character: string, description: string}) => `${c.character}: ${c.description}`).join(", ") || "-"}`);
  }

  // Validation
  console.log("\n--- Validation ---");
  const checks = [
    { name: "4개 씬", pass: scenes.length === 4 },
    { name: "수진 감지", pass: scenes.some((s: any) => s.characters?.some((c: any) => c.name?.includes("수진"))) },
    { name: "민호 감지", pass: scenes.some((s: any) => s.characters?.some((c: any) => c.name?.includes("민호"))) },
    { name: "노트북 소품", pass: scenes.some((s: any) => s.props?.some((p: any) => p.name?.includes("노트북"))) },
    { name: "S#1=INT", pass: scenes[0]?.intExt === "INT" },
    { name: "S#3=EXT", pass: scenes[2]?.intExt === "EXT" },
    { name: "밤 시간대", pass: scenes.some((s: any) => s.timeOfDay === "N") },
  ];

  let allPass = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? "✅" : "❌"} ${check.name}`);
    if (!check.pass) allPass = false;
  }

  console.log(`\n${allPass ? "🎉 ALL CHECKS PASSED" : "⚠️ SOME CHECKS FAILED"}`);

  const fs = await import("fs");
  fs.writeFileSync("test-ai-spike-result.json", JSON.stringify(result, null, 2));
  console.log("Result saved to test-ai-spike-result.json");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
