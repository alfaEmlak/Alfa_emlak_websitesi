import { headers } from "next/headers";

/**
 * E-posta linkleri gibi mutlak URL gereken yerler için base URL üretir.
 *
 * Önce isteğin geldiği gerçek host'u (x-forwarded-host / host) kullanır; böylece
 * link her zaman kullanıcının bulunduğu domaine gider. NEXT_PUBLIC_SITE_URL
 * build sırasında koda gömüldüğü ve yanlış/eski bir değere (ör. kapatılmış bir
 * Vercel deployment'ı) ayarlanmış olabileceği için yalnızca son çare fallback'tir.
 *
 * Yalnızca bir istek bağlamında (server action / route handler) çağrılabilir.
 */
export async function getRequestBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}
