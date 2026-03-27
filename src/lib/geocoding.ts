// In-memory geocoding cache — avoids redundant Kakao API calls
// for identical addresses (e.g., 30 shooting days at the same location).
// Entries never expire within a single process lifetime (acceptable since
// geocoding results are immutable for a given address string).
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * 주소 문자열을 Kakao REST API로 위경도로 변환한다.
 * 실패 시 null 반환 (throw 없음).
 * 동일 주소에 대한 중복 API 호출을 캐시로 방지.
 */
export async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const cached = geocodeCache.get(address);
  if (cached !== undefined) return cached;

  try {
    const apiKey = process.env.KAKAO_REST_API_KEY
    if (!apiKey) return null

    const url = new URL("https://dapi.kakao.com/v2/local/search/address.json")
    url.searchParams.set("query", address)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null

    const json = await res.json()
    const doc = json?.documents?.[0]
    if (!doc) return null

    const lat = parseFloat(doc.y)
    const lng = parseFloat(doc.x)
    if (isNaN(lat) || isNaN(lng)) {
      geocodeCache.set(address, null)
      return null
    }

    const result = { lat, lng }
    geocodeCache.set(address, result)
    return result
  } catch {
    geocodeCache.set(address, null)
    return null
  }
}
