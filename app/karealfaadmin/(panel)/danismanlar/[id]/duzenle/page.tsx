import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AgentEditor } from "@/components/admin/AgentEditor";
import { requireAdmin } from "@/lib/panel-auth";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { data: agent, error } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !agent) notFound();

  return <AgentEditor agent={agent} />;
}
