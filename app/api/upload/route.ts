import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export async function POST(request: Request) {
  try {
    let session: Awaited<ReturnType<typeof getAdminSession>>;
    try {
      session = await getAdminSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Oturum yapılandırması hatası";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Yetkisiz — yeniden giriş yapın." }, { status: 401 });
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
    const buf = Buffer.from(await blob.arrayBuffer());
    const originalName =
      "name" in entry && typeof (entry as File).name === "string" ? (entry as File).name : "";
    const ext = path.extname(originalName) || ".jpg";
    const name = `${Date.now()}-${nanoid()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const fsPath = path.join(dir, name);
    await writeFile(fsPath, buf);

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Yükleme başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
