"use server";

import { revalidatePath } from "next/cache";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function saveSliderSettings(images: string[], interval: number) {
  const user = await requirePanelUser();
  if (user.role !== "ADMIN") {
    throw new Error("Yetkisiz islem. Sadece adminler slider ayarlarini degistirebilir.");
  }

  const sliderJson = JSON.stringify({ images, interval });

  const { error } = await supabaseAdmin
    .from("site_settings")
    .update({ slider_json: sliderJson })
    .eq("id", 1);

  if (error) {
    console.error("Slider settings update error:", error);
    throw new Error("Ayarlar kaydedilemedi: " + error.message);
  }

  revalidatePath("/", "layout");
  return { success: true };
}
