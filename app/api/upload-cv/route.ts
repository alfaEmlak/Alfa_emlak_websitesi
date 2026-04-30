import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase/storage";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXT = /\.(pdf|doc|docx)$/i;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    const blob = entry as Blob;
    const fileName = (entry as File).name || "cv";

    if (blob.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu 5 MB'ı aşamaz." },
        { status: 400 },
      );
    }

    const mimeOk = blob.type ? ALLOWED_MIME.has(blob.type) : false;
    const extOk = ALLOWED_EXT.test(fileName);
    if (!mimeOk && !extOk) {
      return NextResponse.json(
        { error: "Sadece PDF veya Word (DOC/DOCX) dosyaları kabul edilir." },
        { status: 400 },
      );
    }

    const file = new File([blob], fileName, { type: blob.type });
    const { path, url } = await uploadFile(file, "uploads", "cv");

    return NextResponse.json({ url, path, filename: fileName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Yükleme başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
