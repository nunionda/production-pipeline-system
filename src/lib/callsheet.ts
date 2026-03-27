export type CastEntry = {
  name: string;
  role?: string;
  callTime?: string;
};

/**
 * URL ?actor= 파라미터로 출연진 목록에서 해당 배우를 찾는다.
 * 이름 또는 역할명으로 매칭한다. actorParam이 비어있으면 null.
 */
export function findActorInCast(
  cast: CastEntry[],
  actorParam: string
): CastEntry | null {
  if (!actorParam) return null;
  return (
    cast.find((c) => c.name === actorParam || c.role === actorParam) ?? null
  );
}
