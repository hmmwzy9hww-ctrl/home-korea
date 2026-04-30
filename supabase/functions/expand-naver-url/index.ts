// Expands short naver.me / me2.do URLs and returns the final URL + parsed coords.
// Public endpoint (verify_jwt = false in supabase/config.toml).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  try {
    const u = new URL(url);
    const sp = u.searchParams;

    // Common explicit query params
    const latKeys = ["lat", "latitude", "y"];
    const lngKeys = ["lng", "lon", "long", "longitude", "x"];
    let lat: number | null = null;
    let lng: number | null = null;
    for (const k of latKeys) {
      const v = sp.get(k);
      if (v != null && !isNaN(Number(v))) {
        lat = Number(v);
        break;
      }
    }
    for (const k of lngKeys) {
      const v = sp.get(k);
      if (v != null && !isNaN(Number(v))) {
        lng = Number(v);
        break;
      }
    }
    if (lat != null && lng != null && isValidKoreaCoord(lat, lng)) {
      return { lat, lng };
    }

    const full = u.href;

    // map.naver.com/p/entry/place/12345?... — and many variants encode in path
    // Pattern: /<lng>,<lat>,<zoom>,... or @lat,lng,zoom
    // Try @lat,lng pattern
    const at = full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) {
      const a = Number(at[1]);
      const b = Number(at[2]);
      if (isValidKoreaCoord(a, b)) return { lat: a, lng: b };
      if (isValidKoreaCoord(b, a)) return { lat: b, lng: a };
    }

    // c=lng,lat,zoom or c=zoom,0,0,0,dh — naver new map uses c= with various formats
    const c = sp.get("c");
    if (c) {
      const parts = c.split(",").map((p) => Number(p)).filter((n) => !isNaN(n));
      // Try each pair to find a Korea coord (lat ~33-39, lng ~124-132)
      for (let i = 0; i < parts.length - 1; i++) {
        const a = parts[i];
        const b = parts[i + 1];
        if (isValidKoreaCoord(a, b)) return { lat: a, lng: b };
        if (isValidKoreaCoord(b, a)) return { lat: b, lng: a };
      }
    }

    // Generic: find any two consecutive decimal numbers in the URL
    const all = [...full.matchAll(/(-?\d{2,3}\.\d{3,})/g)].map((m) =>
      Number(m[1])
    );
    for (let i = 0; i < all.length - 1; i++) {
      const a = all[i];
      const b = all[i + 1];
      if (isValidKoreaCoord(a, b)) return { lat: a, lng: b };
      if (isValidKoreaCoord(b, a)) return { lat: b, lng: a };
    }

    return null;
  } catch {
    return null;
  }
}

function isValidKoreaCoord(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
}

async function expandUrl(url: string, depth = 0): Promise<string> {
  if (depth > 5) return url;
  try {
    // Try HEAD with manual redirect
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HomeKoreaBot/1.0; +https://homekorea.store)",
      },
    });
    const loc = res.headers.get("location");
    if (loc && (res.status >= 300 && res.status < 400)) {
      const next = new URL(loc, url).toString();
      return expandUrl(next, depth + 1);
    }
    // If body contains a meta refresh or JS redirect to map.naver.com, try to extract
    if (res.status === 200) {
      const text = await res.text();
      const m =
        text.match(/location\.replace\(['"]([^'"]+)['"]\)/) ||
        text.match(/window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/) ||
        text.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+url=([^"'>\s]+)/i);
      if (m) {
        const next = new URL(m[1], url).toString();
        return expandUrl(next, depth + 1);
      }
    }
    return url;
  } catch {
    return url;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First try to parse from the original URL (works for full map.naver.com URLs)
    let coords = parseCoordsFromUrl(url);
    let finalUrl = url;

    if (!coords) {
      finalUrl = await expandUrl(url);
      coords = parseCoordsFromUrl(finalUrl);
    }

    return new Response(
      JSON.stringify({ finalUrl, coords }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
