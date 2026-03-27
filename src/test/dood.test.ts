import { describe, it, expect } from "vitest";
import { buildDoodMatrix, type DoodShootingDay } from "@/lib/dood";

function makeDay(id: string, characterIds: string[], date = new Date("2026-01-01")): DoodShootingDay {
  return {
    id,
    date,
    sceneStatuses: [
      {
        scene: {
          characters: characterIds.map((cid) => ({
            character: { id: cid, name: `캐릭터_${cid}` },
          })),
        },
      },
    ],
  };
}

describe("buildDoodMatrix", () => {
  it("empty days returns empty matrix", () => {
    const { characters, charDaySet } = buildDoodMatrix([]);
    expect(characters).toEqual([]);
    expect(charDaySet.size).toBe(0);
  });

  it("single day, single character", () => {
    const { characters, charDaySet } = buildDoodMatrix([
      makeDay("day-1", ["char-A"]),
    ]);
    expect(characters).toHaveLength(1);
    expect(characters[0].id).toBe("char-A");
    expect(charDaySet.get("char-A")).toEqual(new Set(["day-1"]));
  });

  it("character appears in multiple days", () => {
    const { charDaySet } = buildDoodMatrix([
      makeDay("day-1", ["char-A"]),
      makeDay("day-2", ["char-A"]),
      makeDay("day-3", ["char-B"]),
    ]);
    expect(charDaySet.get("char-A")).toEqual(new Set(["day-1", "day-2"]));
    expect(charDaySet.get("char-B")).toEqual(new Set(["day-3"]));
  });

  it("characters are deduplicated across days", () => {
    const { characters } = buildDoodMatrix([
      makeDay("day-1", ["char-A", "char-B"]),
      makeDay("day-2", ["char-A", "char-C"]),
    ]);
    expect(characters).toHaveLength(3);
    const ids = characters.map((c) => c.id);
    expect(ids).toContain("char-A");
    expect(ids).toContain("char-B");
    expect(ids).toContain("char-C");
  });

  it("characters are sorted by Korean name", () => {
    const days: DoodShootingDay[] = [
      {
        id: "day-1",
        date: new Date(),
        sceneStatuses: [
          {
            scene: {
              characters: [
                { character: { id: "c3", name: "마준" } },
                { character: { id: "c1", name: "나연" } },
                { character: { id: "c2", name: "다호" } },
              ],
            },
          },
        ],
      },
    ];
    const { characters } = buildDoodMatrix(days);
    expect(characters.map((c) => c.name)).toEqual(["나연", "다호", "마준"]);
  });

  it("day with no characters produces empty matrix", () => {
    const { characters, charDaySet } = buildDoodMatrix([
      makeDay("day-1", []),
    ]);
    expect(characters).toHaveLength(0);
    expect(charDaySet.size).toBe(0);
  });

  it("character in multiple scenes on same day counted once per day", () => {
    const day: DoodShootingDay = {
      id: "day-1",
      date: new Date(),
      sceneStatuses: [
        { scene: { characters: [{ character: { id: "char-A", name: "김수진" } }] } },
        { scene: { characters: [{ character: { id: "char-A", name: "김수진" } }] } },
      ],
    };
    const { charDaySet } = buildDoodMatrix([day]);
    expect(charDaySet.get("char-A")).toEqual(new Set(["day-1"]));
  });
});
