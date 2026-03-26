export const MEMBER_ROLE_LABEL: Record<string, string> = {
  PD: "PD/연출",
  AD: "조감독",
  WRITER: "작가",
  ART_DIRECTOR: "미술감독",
  DOP: "촬영감독",
  LIGHTING: "조명감독",
  SOUND: "사운드",
  EDITOR: "편집",
  VFX_SUPERVISOR: "VFX 슈퍼바이저",
  PRODUCER: "프로듀서",
  PRODUCTION_MANAGER: "제작부장",
  STAFF: "일반 스태프",
};

const ROLE_ORDER = [
  "PD", "AD", "PRODUCER", "PRODUCTION_MANAGER", "WRITER",
  "DOP", "LIGHTING", "SOUND", "ART_DIRECTOR",
  "VFX_SUPERVISOR", "EDITOR", "STAFF",
];

export type MemberWithUser = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

export type RoleGroup = {
  role: string;
  label: string;
  members: MemberWithUser[];
};

export function groupByRole(members: MemberWithUser[]): RoleGroup[] {
  const map = new Map<string, MemberWithUser[]>();

  for (const m of members) {
    if (!map.has(m.role)) map.set(m.role, []);
    map.get(m.role)!.push(m);
  }

  return ROLE_ORDER
    .filter((role) => map.has(role))
    .map((role) => ({
      role,
      label: MEMBER_ROLE_LABEL[role] ?? role,
      members: map.get(role)!,
    }));
}
