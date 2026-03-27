import { describe, it, expect } from "vitest";
import { findActorInCast } from "@/lib/callsheet";

const cast = [
  { name: "김민준", role: "수진", callTime: "06:00" },
  { name: "이수진", role: "민호", callTime: "07:00" },
  { name: "박지원", callTime: "08:00" },
];

describe("findActorInCast", () => {
  it("이름으로 배우를 찾는다", () => {
    const result = findActorInCast(cast, "김민준");
    expect(result?.name).toBe("김민준");
  });

  it("역할명으로 배우를 찾는다", () => {
    const result = findActorInCast(cast, "민호");
    expect(result?.name).toBe("이수진");
  });

  it("actorParam이 빈 문자열이면 null 반환", () => {
    expect(findActorInCast(cast, "")).toBeNull();
  });

  it("일치하는 배우가 없으면 null 반환", () => {
    expect(findActorInCast(cast, "없는사람")).toBeNull();
  });

  it("cast가 빈 배열이면 null 반환", () => {
    expect(findActorInCast([], "김민준")).toBeNull();
  });
});
