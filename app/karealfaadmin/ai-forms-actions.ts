"use server";

import { cookies } from "next/headers";
import { getPanelUser } from "@/lib/panel-auth";
import { AI_FORMS_CHECKPOINT_COOKIE } from "@/lib/ai-forms-checkpoint";

/** Admin kullanıcı formları bölümünden çıktığında çağrılır; bir sonraki girişte yeşil “yeni” işaretleri sıfırlanır. */
export async function finalizeAiFormsVisit() {
  const user = await getPanelUser();
  if (!user || user.role !== "ADMIN") return;

  const jar = await cookies();
  jar.set(AI_FORMS_CHECKPOINT_COOKIE, new Date().toISOString(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
