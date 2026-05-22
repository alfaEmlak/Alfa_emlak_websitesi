import Image from "next/image";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export default async function DanismanlarPage() {
  const tc = await getTranslations("Common");

  const { data } = await supabaseAdmin
    .from("agents")
    .select("id,name,title,email,phone,whatsapp,photo,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const agents = (data || []) as AgentRow[];

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">Danışmanlarımız</span>
      </nav>

      <div className="mt-10 max-w-3xl">
        <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
          EKİP
        </span>
        <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
          Danışmanlarımız
        </h1>
        <p className="mt-6 text-base leading-relaxed text-on-surface/60">
          Alfa Emlak ekibi, gayrimenkul yatırımınızda size profesyonel rehberlik etmek için burada. Aşağıdaki danışmanlarımızla
          doğrudan iletişime geçebilirsiniz.
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-primary/10 bg-white p-12 text-center text-on-surface/55">
          Henüz aktif danışman bulunmuyor.
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <article
              key={a.id}
              className="flex flex-col items-center rounded-2xl border border-primary/10 bg-white p-6 text-center shadow-[var(--shadow-ambient)] transition hover:shadow-[var(--shadow-float)]"
            >
              <Link href={`/danismanlar/${a.id}`} className="group flex flex-col items-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-secondary/15 bg-slate-100">
                  {a.photo ? (
                    <Image src={a.photo} alt={a.name || "Danışman"} fill className="object-cover" sizes="112px" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-primary/30">
                      {(a.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="mt-5 font-headline text-lg font-extrabold text-primary transition group-hover:text-secondary">{a.name || "—"}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-secondary">
                  {a.title || "Emlak Danışmanı"}
                </p>
              </Link>
              <Link
                href={`/danismanlar/${a.id}`}
                className="mt-4 text-xs font-semibold text-secondary underline-offset-4 hover:underline"
              >
                İlanlarını gör →
              </Link>

              <div className="mt-6 flex w-full flex-col gap-2 text-sm">
                {a.phone ? (
                  <a
                    href={`tel:${a.phone.replace(/\s/g, "")}`}
                    className="rounded-lg border border-primary/10 px-3 py-2 text-primary transition hover:border-secondary hover:text-secondary"
                  >
                    {a.phone}
                  </a>
                ) : null}
                {a.whatsapp ? (
                  <a
                    href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    WhatsApp
                  </a>
                ) : null}
                {a.email ? (
                  <a
                    href={`mailto:${a.email}`}
                    className="rounded-lg border border-primary/10 px-3 py-2 text-primary transition hover:border-secondary hover:text-secondary"
                  >
                    {a.email}
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
