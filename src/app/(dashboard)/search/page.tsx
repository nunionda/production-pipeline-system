import Link from "next/link";
import { db } from "@/lib/db";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  let scenes: Awaited<ReturnType<typeof db.scene.findMany<{
    where: object;
    include: { script: { include: { project: { select: { id: true; title: true } } } } };
    take: number;
  }>>> = [];
  let characters: Awaited<ReturnType<typeof db.character.findMany<{
    where: object;
    include: { project: { select: { id: true; title: true } } };
    take: number;
  }>>> = [];
  let props: Awaited<ReturnType<typeof db.prop.findMany<{
    where: object;
    include: { project: { select: { id: true; title: true } } };
    take: number;
  }>>> = [];
  let locations: Awaited<ReturnType<typeof db.location.findMany<{
    where: object;
    include: { project: { select: { id: true; title: true } } };
    take: number;
  }>>> = [];

  if (q.trim()) {
    [scenes, characters, props, locations] = await Promise.all([
      db.scene.findMany({
        where: {
          OR: [
            { location: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          script: { include: { project: { select: { id: true, title: true } } } },
        },
        take: 10,
      }),
      db.character.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { project: { select: { id: true, title: true } } },
        take: 10,
      }),
      db.prop.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        include: { project: { select: { id: true, title: true } } },
        take: 10,
      }),
      db.location.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        include: { project: { select: { id: true, title: true } } },
        take: 10,
      }),
    ]);
  }

  const total = scenes.length + characters.length + props.length + locations.length;
  const hasQuery = q.trim().length > 0;
  const hasResults = total > 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">검색</h2>
        <p className="mt-0.5 text-sm text-gray-500">씬, 등장인물, 소품, 로케이션</p>
      </div>

      {/* Search form */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="검색어를 입력하세요..."
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-800"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          검색
        </button>
      </form>

      {/* Results */}
      {hasQuery ? (
        hasResults ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{total}개</span> 결과
            </p>

            {/* Scenes */}
            {scenes.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">씬</h3>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {scenes.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                  {scenes.map((scene) => (
                    <Link
                      key={scene.id}
                      href={`/projects/${scene.script.project.id}/script`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          S#{scene.number}
                          {scene.location && (
                            <span className="ml-2 font-normal text-gray-700">{scene.location}</span>
                          )}
                        </p>
                        {scene.description && (
                          <p className="mt-0.5 text-xs text-gray-500 truncate">{scene.description}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {scene.script.project.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Characters */}
            {characters.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">등장인물</h3>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {characters.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                  {characters.map((char) => (
                    <Link
                      key={char.id}
                      href={`/projects/${char.project.id}/pre-production/characters`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{char.name}</p>
                        {char.description && (
                          <p className="mt-0.5 text-xs text-gray-500 truncate">{char.description}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {char.project.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Props */}
            {props.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">소품</h3>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {props.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                  {props.map((prop) => (
                    <Link
                      key={prop.id}
                      href={`/projects/${prop.project.id}/pre-production/props`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{prop.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {prop.status && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            prop.status === "ACQUIRED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {prop.status === "ACQUIRED" ? "확보" : "미확보"}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{prop.project.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Locations */}
            {locations.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">로케이션</h3>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {locations.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                  {locations.map((loc) => (
                    <Link
                      key={loc.id}
                      href={`/projects/${loc.project.id}/pre-production/locations`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {loc.status && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            loc.status === "CONFIRMED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {loc.status === "CONFIRMED" ? "확정" : "미확인"}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{loc.project.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">
              &apos;{q}&apos;에 대한 검색 결과가 없습니다
            </p>
          </div>
        )
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center">
          <p className="text-2xl mb-3">🔍</p>
          <p className="text-sm font-medium text-gray-700">프로젝트 전체를 검색하세요</p>
          <p className="mt-1 text-xs text-gray-400">씬 번호, 등장인물 이름, 소품, 로케이션을 검색할 수 있습니다</p>
        </div>
      )}
    </div>
  );
}
