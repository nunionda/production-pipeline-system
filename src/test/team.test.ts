import { describe, it, expect } from "vitest";
import { groupByRole } from "@/lib/team";

describe("groupByRole", () => {
  it("groups members by role", () => {
    const members = [
      { id: "1", role: "PD", user: { id: "u1", name: "김철수", email: "a@b.com", phone: null } },
      { id: "2", role: "AD", user: { id: "u2", name: "이영희", email: "c@d.com", phone: "010-1234" } },
      { id: "3", role: "PD", user: { id: "u3", name: "박민준", email: "e@f.com", phone: null } },
    ];

    const result = groupByRole(members);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("PD");
    expect(result[0].label).toBe("PD/연출");
    expect(result[0].members).toHaveLength(2);
    expect(result[1].role).toBe("AD");
    expect(result[1].members).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(groupByRole([])).toEqual([]);
  });

  it("preserves member order within group", () => {
    const members = [
      { id: "1", role: "AD", user: { id: "u1", name: "가나다", email: "a@b.com", phone: null } },
      { id: "2", role: "AD", user: { id: "u2", name: "마바사", email: "c@d.com", phone: null } },
    ];
    const result = groupByRole(members);
    expect(result[0].members[0].user.name).toBe("가나다");
    expect(result[0].members[1].user.name).toBe("마바사");
  });

  it("sorts groups by canonical role order (PD before AD before DOP)", () => {
    const members = [
      { id: "1", role: "DOP", user: { id: "u1", name: "A", email: "a@b.com", phone: null } },
      { id: "2", role: "PD", user: { id: "u2", name: "B", email: "b@b.com", phone: null } },
      { id: "3", role: "AD", user: { id: "u3", name: "C", email: "c@b.com", phone: null } },
    ];
    const result = groupByRole(members);
    expect(result[0].role).toBe("PD");
    expect(result[1].role).toBe("AD");
    expect(result[2].role).toBe("DOP");
  });
});
