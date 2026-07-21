/**
 * 101evler feed'indeki "realtor" adı ile paneldeki danışman (agents) adını eşler.
 *
 * Feed bazı danışmanları farklı adla/sırayla gönderiyor (örn. "Umut Alfa" →
 * panelde "ALFA UMUT"). Bu eşleme sayesinde içe aktarım, ilanı doğru danışmana
 * (created_by_agent_id) bağlar; böylece panel filtreleri ilanları yakalar.
 *
 * Yeni bir uyumsuzluk çıkarsa buraya "feed adı: panel adı" satırı eklemek yeterli.
 * Anahtar: feed'deki ad — Değer: agents tablosundaki birebir ad.
 *
 * DİKKAT: Danışman adı panelden değiştirilirse buradaki değer de güncellenmeli.
 * Aksi hâlde eşleme sessizce kırılır ve ilanlar hiçbir danışmana bağlanmaz —
 * bu tablodaki üç satır tam olarak bu yüzden bozulmuştu (2026-07).
 */
export const FEED_REALTOR_ALIASES: Record<string, string> = {
  "Alfa Doğa": "ALFA DOĞA",
  "Alfa Yousra": "ALFA YOUSRA",
  "Belkıs Alfa": "ALFA Belkıs",
  "Umut Alfa": "ALFA UMUT",
  "Alfa Elena": "Elena",
};

/** Ad karşılaştırması için normalleştirir (Türkçe büyük/küçük, fazla boşluk, unicode). */
export function normalizeAgentName(s: string): string {
  return s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

/**
 * agents listesinden (id + name) bir çözümleyici üretir.
 * Önce takma ad tablosuna, sonra birebir ada (büyük/küçük harf duyarsız) bakar.
 */
export function buildRealtorResolver(agents: { id: string; name: string }[]) {
  const byNorm = new Map<string, string>();
  for (const a of agents) {
    if (a?.id && a?.name) byNorm.set(normalizeAgentName(a.name), a.id);
  }
  return (feedName: string | null | undefined): string | null => {
    if (!feedName) return null;
    const raw = feedName.trim();
    if (!raw) return null;
    const canonical = FEED_REALTOR_ALIASES[raw] ?? raw;
    return byNorm.get(normalizeAgentName(canonical)) ?? null;
  };
}
