import { redirect } from "next/navigation";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LookupManager, type LookupTabData } from "@/components/admin/LookupManager";
import { LOOKUP_TABLES, type LookupTableName } from "@/lib/feeds/lookup-meta";

export const dynamic = "force-dynamic";

export default async function LookupsPage() {
  const user = await requirePanelUser();
  if (user.role !== "ADMIN") {
    redirect("/karealfaadmin/dashboard");
  }

  const tableNames = Object.keys(LOOKUP_TABLES) as LookupTableName[];

  const results = await Promise.all(
    tableNames.map(async (table) => {
      const meta = LOOKUP_TABLES[table];

      if (meta.kind === "currency") {
        const { data } = await supabaseAdmin
          .from(table)
          .select("iso, code, label, is_active")
          .order("iso");
        return { table, meta, rows: data ?? [] } satisfies LookupTabData;
      }
      if (meta.kind === "ad_spec") {
        const { data } = await supabaseAdmin
          .from(table)
          .select("tag, label_tr, label_en, sort, is_active")
          .order("sort");
        return { table, meta, rows: data ?? [] } satisfies LookupTabData;
      }
      if (meta.kind === "area") {
        const { data } = await supabaseAdmin
          .from(table)
          .select("id, city, label, sort, is_active")
          .order("city")
          .order("sort");
        return { table, meta, rows: data ?? [] } satisfies LookupTabData;
      }
      const { data } = await supabaseAdmin
        .from(table)
        .select("id, label, sort, is_active")
        .order("sort");
      return { table, meta, rows: data ?? [] } satisfies LookupTabData;
    }),
  );

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">İlan Lookup&apos;ları</h1>
        <p className="mt-1 text-sm text-zinc-500">
          101evler ve Hangiev XML feed&apos;lerinde kullanılan referans verileri buradan yönetilir.
          Eklediğiniz değerler ilan editöründeki dropdown&apos;larda anında görünür.
        </p>
      </div>
      <LookupManager tabs={results} />
    </div>
  );
}
