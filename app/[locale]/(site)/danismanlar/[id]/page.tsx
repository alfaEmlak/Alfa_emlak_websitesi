import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTranslatedListing } from "@/lib/i18n-utils";
import { buildListingFilters, findPublishedListingsSafe } from "@/lib/listings-query";
import { PropertyCard } from "@/components/site/PropertyCard";

export const revalidate = 60;

type AgentRow = {
  id: string;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  photo: string | null;
  is_active: boolean | null;
};

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ConsultantListingsPage({ params }: Props) {
  const { locale, id } = await params;
  const tc = await getTranslations("Common");

  const { data: agentData } = await supabaseAdmin
    .from("agents")
    .select("id,name,title,email,phone,whatsapp,photo,is_active")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  const agent = agentData as AgentRow | null;
  if (!agent) notFound();

  const { where } = buildListingFilters({ danisman: id, danismanAdi: agent.name ?? "" });
  const itemsRaw = await findPublishedListingsSafe(where, 60, 0);
  const items = itemsRaw.map((l) => getTranslatedListing(l, locale));

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/danismanlar" className="hover:text-secondary">
          Danışmanlarımız
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{agent.name || "—"}</span>
      </nav>

      <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-secondary/15 bg-slate-100">
          {agent.photo ? (
            <Image src={agent.photo} alt={agent.name || "Danışman"} fill className="object-cover" sizes="96px" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-primary/30">
              {(agent.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
            {agent.title || "Emlak Danışmanı"}
          </span>
          <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
            {agent.name || "—"}
          </h1>
          <p className="mt-2 text-sm text-on-surface/50">
            {items.length} {tc("listings").toLowerCase()}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {agent.phone ? (
              <a
                href={`tel:${agent.phone.replace(/\s/g, "")}`}
                className="rounded-lg border border-primary/10 px-3 py-2 text-primary transition hover:border-secondary hover:text-secondary"
              >
                {agent.phone}
              </a>
            ) : null}
            {agent.whatsapp ? (
              <a
                href={`https://wa.me/${agent.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                WhatsApp
              </a>
            ) : null}
            {agent.email ? (
              <a
                href={`mailto:${agent.email}`}
                className="rounded-lg border border-primary/10 px-3 py-2 text-primary transition hover:border-secondary hover:text-secondary"
              >
                {agent.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-primary/10 bg-white p-12 text-center text-on-surface/55">
          Bu danışmana ait yayında ilan bulunmuyor.
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {items.map((l, i) => (
            <PropertyCard key={l.id} listing={l} stagger={i % 3 === 1} />
          ))}
        </div>
      )}
    </main>
  );
}
