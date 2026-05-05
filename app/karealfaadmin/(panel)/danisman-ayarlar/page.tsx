import { redirect } from "next/navigation";
import { ConsultantProfileForm } from "@/components/admin/ConsultantProfileForm";
import { requireRole } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ConsultantSettingsPage() {
  const user = await requireRole("CONSULTANT");
  if (!user.agentId) {
    redirect("/karealfaadmin/dashboard");
  }

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("name, phone, photo, email")
    .eq("id", user.agentId)
    .maybeSingle();

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-3xl font-extrabold">Danışman Ayarları</h1>
      <p className="mt-1 text-sm text-zinc-500">Adınız, telefonunuz ve profil fotoğrafınızı güncelleyin.</p>
      <ConsultantProfileForm
        initialName={agent?.name ?? user.name ?? ""}
        initialPhone={agent?.phone ?? ""}
        initialPhoto={agent?.photo ?? ""}
        email={agent?.email ?? ""}
      />
    </div>
  );
}

