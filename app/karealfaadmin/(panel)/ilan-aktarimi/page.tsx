import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ListingTransferForm } from "@/components/admin/ListingTransferForm";

export const dynamic = "force-dynamic";

export default async function ListingTransferPage() {
  await requireAdmin();

  const { data } = await supabaseAdmin
    .from("agents")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  const agents = (data ?? [])
    .filter((a) => typeof a.name === "string" && a.name.trim())
    .map((a) => ({
      id: String(a.id),
      name: String(a.name),
      isActive: a.is_active === true,
    }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-xl font-black">İlan aktarımı</h1>
      <p className="mt-1 text-sm opacity-70">
        Bir danışmanın ilanlarını başka bir danışmana toplu devredin. Ayrılan danışman
        senaryosu için tasarlandı.
      </p>

      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-bold">Aktarım neleri değiştirir?</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            İlanın sahibi (<code>created_by_agent_id</code>) ve panel filtrelerinde
            göründüğü danışman.
          </li>
          <li>
            İlan detayında ve <strong>101evler / hangiev feed&apos;lerinde</strong> yayınlanan
            danışman adı, telefon, WhatsApp, e-posta ve fotoğraf.
          </li>
          <li>
            Güncelleme tarihi tazelenir — portallar değişikliği bir sonraki XML
            çekiminde otomatik alır, karşı tarafta elle işlem gerekmez.
          </li>
          <li>
            Aktarılan ilanlar <strong>danışman kilidi</strong> alır: 101evler içe
            aktarımı bu ilanların danışmanını feed&apos;deki eski ada göre geri yazamaz.
          </li>
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-(--ghost-outline) bg-(--surface) p-4">
        {agents.length < 2 ? (
          <p className="text-sm opacity-70">
            Aktarım için en az iki danışman kaydı gerekiyor.
          </p>
        ) : (
          <ListingTransferForm agents={agents} />
        )}
      </div>
    </div>
  );
}
