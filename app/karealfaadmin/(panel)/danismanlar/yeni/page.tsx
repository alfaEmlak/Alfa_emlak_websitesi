import { AgentEditor } from "@/components/admin/AgentEditor";
import { requireAdmin } from "@/lib/panel-auth";

export default async function NewAgentPage() {
  await requireAdmin();
  return <AgentEditor />;
}
