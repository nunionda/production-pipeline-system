/**
 * 주소 문자열을 Kakao REST API로 위경도로 변환한다.
 * 실패 시 null 반환 (throw 없음).
 */
export async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
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
    if (isNaN(lat) || isNaN(lng)) return null

    return { lat, lng }
  } catch {
    return null
  }
}
