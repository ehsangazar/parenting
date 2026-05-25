const TIMEOUT_MS = 3000;

type GeoResult = { country: string; countryName: string } | null;

export async function detectCountryFromIp(ip: string): Promise<GeoResult> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,country`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = (await res.json()) as { status: string; countryCode?: string; country?: string };
    if (data.status !== "success" || !data.countryCode) return null;

    return { country: data.countryCode, countryName: data.country ?? data.countryCode };
  } catch {
    return null;
  }
}
