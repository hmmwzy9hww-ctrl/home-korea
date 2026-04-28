import { createServerFn } from "@tanstack/react-start";

type Coords = { lat: number; lon: number } | null;

async function kakaoAddress(query: string, key: string): Promise<Coords> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
  if (!res.ok) return null;
  const json = (await res.json()) as { documents?: Array<{ x: string; y: string }> };
  const d = json.documents?.[0];
  if (!d) return null;
  return { lat: parseFloat(d.y), lon: parseFloat(d.x) };
}

async function kakaoKeyword(query: string, key: string): Promise<Coords> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
  if (!res.ok) return null;
  const json = (await res.json()) as { documents?: Array<{ x: string; y: string }> };
  const d = json.documents?.[0];
  if (!d) return null;
  return { lat: parseFloat(d.y), lon: parseFloat(d.x) };
}

function cleanAddress(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/\([^)]*\)/g, " ");
  const tokens = s.split(/\s+/).filter(Boolean);
  const adminSuffix = /(시|도|구|군|동|읍|면|리|로|길|가)$/;
  const jibun = /^\d+(-\d+)?$/;
  const kept: string[] = [];
  for (const t of tokens) {
    if (/(호|층|실|관|빌딩|빌라|아파트|오피스텔|상가|건물)/.test(t)) break;
    if (/^\d+동$/.test(t)) break;
    if (adminSuffix.test(t) || jibun.test(t)) kept.push(t);
    else if (kept.length === 0) kept.push(t);
  }
  return kept.join(" ").trim();
}

function dongGu(raw: string): string {
  const c = cleanAddress(raw);
  return c
    .split(/\s+/)
    .filter((t) => /(시|도|구|군|동|읍|면|리)$/.test(t))
    .join(" ")
    .trim();
}

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { address?: string; area?: string }) => ({
    address: (input.address || "").trim(),
    area: (input.area || "").trim(),
  }))
  .handler(async ({ data }): Promise<Coords> => {
    const { address, area } = data;
    if (!address && !area) return null;

    const key = process.env.KAKAO_REST_API_KEY;
    const cleaned = cleanAddress(address);
    const dg = dongGu(address);

    // Build query candidates: 도로명/지번 full -> with area -> 동/구 -> area
    const candidates = [
      cleaned,
      cleaned && area ? `${cleaned} ${area}` : "",
      address,
      dg,
      area,
    ].filter(Boolean);

    if (key) {
      // Try Kakao address API first (handles both 도로명 and 지번)
      for (const q of candidates) {
        const r = await kakaoAddress(q, key);
        if (r) return r;
      }
      // Fallback to keyword search (POIs / building names)
      for (const q of candidates) {
        const r = await kakaoKeyword(q, key);
        if (r) return r;
      }
    }

    // Last resort: Nominatim with 대한민국 suffix
    for (const q of candidates) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q + " 대한민국",
        )}&format=json&limit=1&accept-language=ko&countrycodes=kr`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (arr?.[0]) {
          return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
        }
      } catch {
        /* continue */
      }
    }

    return null;
  });
