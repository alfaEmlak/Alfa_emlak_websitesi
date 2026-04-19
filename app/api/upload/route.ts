import { NextResponse } from "next/server";
import { getPanelSession } from "@/lib/panel-auth";
import { uploadFile } from "@/lib/supabase/storage";

export async function POST(request: Request) {
  try {
    let session: Awaited<ReturnType<typeof getPanelSession>>;
    try {
      session = await getPanelSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Oturum yapılandırması hatası";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!session.role) {
      return NextResponse.json({ error: "Yetkisiz, yeniden giriş yapın." }, { status: 401 });
    }

    const form = await request.formData();
    const entry = form.get("file");
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
    }
    if (!("arrayBuffer" in entry) || typeof (entry as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Geçersiz dosya alanı" }, { status: 400 });
    }

    const blob = entry as Blob;
    const fileName = (entry as File).name || "upload";
    const file = new File([blob], fileName, { type: blob.type });
    const { path: filePath, url } = await uploadFile(file, "uploads");

    return NextResponse.json({ url, path: filePath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Yükleme başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
