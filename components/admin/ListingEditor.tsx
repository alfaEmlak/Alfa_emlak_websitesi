"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Listing, ListingImage } from "@prisma/client";
import { saveListing, type ListingSavePayload } from "@/app/admin/actions";
import { KKTC_ILCE_ADLARI, kktcBucaklar, kktcYerlesimler } from "@/lib/kktc-locations";
import {
  NEARBY_POI_CATEGORIES,
  parseNearbyPoiCategoriesJson,
  serializeNearbyPoiCategoriesJson,
  type NearbyPoiCategoryId,
} from "@/lib/nearby-poi";
import { parseLatLngPair, parseNearby, parseStringArray } from "@/lib/listing-utils";
import { NearbyPoiAdminPreview } from "@/components/admin/NearbyPoiAdminPreview";

const LOCATION_SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20";

type GalleryRow = { url: string; sortOrder: number; isPrimary: boolean };

const PROPERTY_LABELS: Record<
  "bedrooms" | "bathrooms" | "areaM2" | "plotAreaM2" | "floor" | "buildingAge" | "livingRooms",
  string
> = {
  bedrooms: "Yatak odası sayısı",
  bathrooms: "Banyo sayısı",
  areaM2: "İç alan (m²)",
  plotAreaM2: "Arsa / arazi (m²)",
  floor: "Bulunduğu kat",
  buildingAge: "Bina yaşı (yıl)",
  livingRooms: "Salon / oturma odası sayısı",
};

const CONSULTANT_LABELS: Record<
  | "consultantName"
  | "consultantPhone"
  | "consultantWhatsapp"
  | "consultantEmail"
  | "consultantOffice"
  | "consultantPhoto"
  | "consultantOfficeLogo",
  string
> = {
  consultantName: "Ad soyad",
  consultantPhone: "Telefon",
  consultantWhatsapp: "WhatsApp",
  consultantEmail: "E-posta",
  consultantOffice: "Ofis / unvan",
  consultantPhoto: "Fotoğraf bağlantısı",
  consultantOfficeLogo: "Ofis logosu bağlantısı",
};

/** Bazı Windows / telefon aktarımlarında MIME boş veya application/octet-stream olur. */
const LIKELY_IMAGE_EXT = /\.(jpe?g|jfif|png|gif|webp|bmp|heic|heif|avif|tif{1,2})$/i;

function isSelectableImageFile(f: File): boolean {
  const t = (f.type || "").trim().toLowerCase();
  if (t.startsWith("image/")) return true;
  if ((t === "" || t === "application/octet-stream") && LIKELY_IMAGE_EXT.test(f.name)) return true;
  return false;
}

async function postUploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let data: { url?: string; error?: string };
  if (ct.includes("application/json")) {
    data = (await res.json()) as { url?: string; error?: string };
  } else {
    const text = (await res.text()).trim().slice(0, 200);
    throw new Error(
      text
        ? `Sunucu yanıtı (${res.status}): ${text}`
        : `Yükleme başarısız (HTTP ${res.status}).`,
    );
  }
  if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");
  if (!data.url) throw new Error("Sunucu adres döndürmedi");
  return data.url;
}

type Props = {
  listing: (Listing & { images: ListingImage[] }) | null;
  suggestedId: string;
};

const defaultDetailTemplate = `{
  "salesPrice": { "value": "", "visible": true },
  "listingNo": { "value": "", "visible": true },
  "housingType": { "value": "", "visible": true },
  "interiorArea": { "value": "", "visible": true }
}`;

export function ListingEditor({ listing, suggestedId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const initialGallery = useMemo((): GalleryRow[] => {
    if (!listing?.images?.length) return [];
    return [...listing.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((im, i) => ({ url: im.url, sortOrder: i, isPrimary: im.isPrimary }));
  }, [listing]);

  const [gallery, setGallery] = useState<GalleryRow[]>(initialGallery);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadHint, setUploadHint] = useState("");

  const [form, setForm] = useState({
    listingId: listing?.listingId ?? suggestedId,
    title: listing?.title ?? "",
    kind: listing?.kind ?? "SATILIK",
    propertyType: listing?.propertyType ?? "Konut",
    city: listing?.city ?? "",
    region: listing?.region ?? "",
    neighborhood: listing?.neighborhood ?? "",
    fullAddress: listing?.fullAddress ?? "",
    price: listing != null ? String(listing.price) : "",
    currency: listing?.currency ?? "EUR",
    shortDescription: listing?.shortDescription ?? "",
    longDescription: listing?.longDescription ?? "",
    coverImage: listing?.coverImage ?? "",
    bedrooms: listing?.bedrooms != null ? String(listing.bedrooms) : "",
    bathrooms: listing?.bathrooms != null ? String(listing.bathrooms) : "",
    areaM2: listing?.areaM2 != null ? String(listing.areaM2) : "",
    plotAreaM2: listing?.plotAreaM2 != null ? String(listing.plotAreaM2) : "",
    floor: listing?.floor ?? "",
    buildingAge: listing?.buildingAge != null ? String(listing.buildingAge) : "",
    livingRooms: listing?.livingRooms != null ? String(listing.livingRooms) : "",
    hasPool: listing?.hasPool ?? false,
    hasGarden: listing?.hasGarden ?? false,
    hasFireplace: listing?.hasFireplace ?? false,
    hasParking: listing?.hasParking ?? false,
    furnished: listing?.furnished ?? false,
    seaView: listing?.seaView ?? false,
    detailFields: listing?.detailFields ?? defaultDetailTemplate,
    featuresText: parseStringArray(listing?.features ?? null).join("\n"),
    nearbyEnabled: listing?.nearbyEnabled ?? false,
    nearbyText: JSON.stringify(parseNearby(listing?.nearbyPlaces ?? null), null, 2),
    poiCategories: parseNearbyPoiCategoriesJson(listing?.nearbyPoiCategoriesJson),
    badgeFeatured: listing?.badgeFeatured ?? false,
    badgeExclusive: listing?.badgeExclusive ?? false,
    badgeVirtualTour: listing?.badgeVirtualTour ?? false,
    badgeVideo: listing?.badgeVideo ?? false,
    badgeNew: listing?.badgeNew ?? false,
    badgePriceDrop: listing?.badgePriceDrop ?? false,
    virtualTourUrl: listing?.virtualTourUrl ?? "",
    virtualTourEnabled: listing?.virtualTourEnabled ?? false,
    videoUrl: listing?.videoUrl ?? "",
    videoEnabled: listing?.videoEnabled ?? false,
    coordinates:
      listing?.lat != null && listing?.lng != null ? `${listing.lat},${listing.lng}` : "",
    mapEnabled: listing?.mapEnabled ?? false,
    consultantName: listing?.consultantName ?? "",
    consultantPhone: listing?.consultantPhone ?? "",
    consultantWhatsapp: listing?.consultantWhatsapp ?? "",
    consultantEmail: listing?.consultantEmail ?? "",
    consultantOffice: listing?.consultantOffice ?? "",
    consultantPhoto: listing?.consultantPhoto ?? "",
    consultantOfficeLogo: listing?.consultantOfficeLogo ?? "",
    publishStatus: listing?.publishStatus ?? "DRAFT",
    statsShowViews: listing?.statsShowViews ?? true,
    statsShowFavs: listing?.statsShowFavs ?? true,
    statsShowRating: listing?.statsShowRating ?? false,
    rating: listing?.rating != null ? String(listing.rating) : "",
    favoritesCount: listing?.favoritesCount ?? 0,
  });

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm((f) => ({ ...f, [k]: v } as typeof form));

  const bucakAdlari = useMemo(() => kktcBucaklar(form.city).map((b) => b.name), [form.city]);
  const yerlesimler = useMemo(() => kktcYerlesimler(form.city, form.region), [form.city, form.region]);
  const cityInList = form.city === "" || KKTC_ILCE_ADLARI.includes(form.city);
  const regionInList = form.region === "" || bucakAdlari.includes(form.region);
  const neighborhoodInList = form.neighborhood === "" || yerlesimler.includes(form.neighborhood);

  const previewCoords = useMemo(() => {
    const p = parseLatLngPair(form.coordinates);
    if (!p?.lat || !p?.lng) return { lat: null as number | null, lng: null as number | null };
    const la = Number(p.lat);
    const ln = Number(p.lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return { lat: null, lng: null };
    return { lat: la, lng: ln };
  }, [form.coordinates]);

  function togglePoiCategory(id: NearbyPoiCategoryId) {
    setForm((f) => ({
      ...f,
      poiCategories: { ...f.poiCategories, [id]: !f.poiCategories[id] },
    }));
  }

  async function onCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    const file = picked[0];
    if (!file) return;
    if (!isSelectableImageFile(file)) {
      setMessage("Bu dosya resim olarak tanınmadı. JPG, PNG, WEBP veya HEIC deneyin.");
      return;
    }
    setMessage(null);
    setUploadBusy(true);
    setUploadHint("Kapak yükleniyor…");
    try {
      const url = await postUploadFile(file);
      set("coverImage", url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Yükleme hatası");
    } finally {
      setUploadBusy(false);
      setUploadHint("");
    }
  }

  async function onGalleryFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    const list = picked.filter(isSelectableImageFile);
    if (!list.length) {
      setMessage(
        "Seçilen dosyalar resim olarak tanınmadı (Windows’ta bazen tür bilgisi gelmez). JPG, PNG veya WEBP deneyin.",
      );
      return;
    }
    setMessage(null);
    setUploadBusy(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < list.length; i++) {
        setUploadHint(`${i + 1} / ${list.length} fotoğraf yükleniyor…`);
        urls.push(await postUploadFile(list[i]));
      }
      setGallery((g) => {
        const had = g.filter((x) => x.url.trim());
        const merged: GalleryRow[] = [
          ...had.map((x, i) => ({ ...x, sortOrder: i })),
          ...urls.map((url, i) => ({
            url,
            sortOrder: had.length + i,
            isPrimary: had.length === 0 && i === 0,
          })),
        ];
        const withPrimary =
          merged.some((x) => x.isPrimary) || !merged.length
            ? merged
            : merged.map((x, j) => ({ ...x, isPrimary: j === 0 }));
        return withPrimary.map((x, j) => ({ ...x, sortOrder: j }));
      });
      setForm((f) => {
        if (f.coverImage.trim()) return f;
        return { ...f, coverImage: urls[0] ?? f.coverImage };
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Yükleme hatası");
    } finally {
      setUploadBusy(false);
      setUploadHint("");
    }
  }

  function moveGallery(idx: number, dir: -1 | 1) {
    setGallery((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy.map((row, i) => ({ ...row, sortOrder: i }));
    });
  }

  function removeGalleryRow(idx: number) {
    setGallery((prev) => {
      const row = prev[idx];
      if (!row) return prev;
      const removedUrl = row.url.trim();
      const next = prev.filter((_, i) => i !== idx);
      const withPrimary =
        row.isPrimary && next.length
          ? next.map((r, i) => ({ ...r, sortOrder: i, isPrimary: i === 0 }))
          : next.map((r, i) => ({ ...r, sortOrder: i }));
      if (removedUrl) {
        const nextCover = (withPrimary.find((r) => r.isPrimary) ?? withPrimary[0])?.url?.trim() ?? "";
        requestAnimationFrame(() => {
          setForm((f) => (f.coverImage.trim() !== removedUrl ? f : { ...f, coverImage: nextCover }));
        });
      }
      return withPrimary;
    });
  }

  function makeGalleryPrimary(idx: number) {
    setGallery((prev) => {
      const url = prev[idx]?.url?.trim() ?? "";
      if (url) {
        requestAnimationFrame(() => setForm((f) => ({ ...f, coverImage: url })));
      }
      return prev.map((g, i) => ({ ...g, isPrimary: i === idx }));
    });
  }

  function normalizeGalleryForSave(rows: GalleryRow[]): GalleryRow[] {
    const trimmed = rows.filter((g) => g.url.trim());
    if (!trimmed.length) return [];
    let next = trimmed.map((g, i) => ({ ...g, sortOrder: i }));
    if (!next.some((g) => g.isPrimary)) {
      next = next.map((g, i) => ({ ...g, isPrimary: i === 0 }));
    }
    return next;
  }

  function saveDraft() {
    startTransition(() => {
      void doSave("DRAFT");
    });
  }

  function publish() {
    startTransition(() => {
      void doSave("PUBLISHED");
    });
  }

  async function doSave(statusOverride?: string) {
    setMessage(null);
    const featuresLines = form.featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const nearbyJson = form.nearbyText.trim();
    try {
      if (nearbyJson) JSON.parse(nearbyJson);
    } catch {
      setMessage("Çevredeki yerler geçerli JSON olmalı.");
      return;
    }
    try {
      if (form.detailFields.trim()) JSON.parse(form.detailFields);
    } catch {
      setMessage("Detay tablosu (JSON) geçersiz.");
      return;
    }

    const parsedCoords = parseLatLngPair(form.coordinates);
    if (parsedCoords === null) {
      setMessage("Koordinat formatı hatalı. Örnek: 35.2501910, 33.0203320");
      return;
    }

    const normGallery = normalizeGalleryForSave(gallery);
    let coverOut = form.coverImage.trim();
    if (!coverOut && normGallery.length > 0) {
      const primary = normGallery.find((g) => g.isPrimary) ?? normGallery[0];
      coverOut = primary.url;
    }

    const payload: ListingSavePayload = {
      id: listing?.id,
      listingId: form.listingId,
      title: form.title,
      kind: form.kind,
      propertyType: form.propertyType,
      city: form.city,
      region: form.region,
      neighborhood: form.neighborhood,
      fullAddress: form.fullAddress,
      price: Number(form.price) || 0,
      currency: form.currency,
      shortDescription: form.shortDescription,
      longDescription: form.longDescription,
      coverImage: coverOut,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      areaM2: form.areaM2,
      plotAreaM2: form.plotAreaM2,
      floor: form.floor,
      buildingAge: form.buildingAge,
      livingRooms: form.livingRooms,
      hasPool: form.hasPool,
      hasGarden: form.hasGarden,
      hasFireplace: form.hasFireplace,
      hasParking: form.hasParking,
      furnished: form.furnished,
      seaView: form.seaView,
      detailFields: form.detailFields.trim() ? form.detailFields : JSON.stringify({}),
      features: JSON.stringify(featuresLines),
      nearbyPlaces: nearbyJson || "[]",
      nearbyEnabled: form.nearbyEnabled,
      nearbyPoiCategoriesJson: serializeNearbyPoiCategoriesJson(form.poiCategories) ?? "",
      badgeFeatured: form.badgeFeatured,
      badgeExclusive: form.badgeExclusive,
      badgeVirtualTour: form.badgeVirtualTour,
      badgeVideo: form.badgeVideo,
      badgeNew: form.badgeNew,
      badgePriceDrop: form.badgePriceDrop,
      virtualTourUrl: form.virtualTourUrl,
      virtualTourEnabled: form.virtualTourEnabled,
      videoUrl: form.videoUrl,
      videoEnabled: form.videoEnabled,
      lat: parsedCoords.lat,
      lng: parsedCoords.lng,
      mapEnabled: form.mapEnabled,
      consultantName: form.consultantName,
      consultantPhone: form.consultantPhone,
      consultantWhatsapp: form.consultantWhatsapp,
      consultantEmail: form.consultantEmail,
      consultantOffice: form.consultantOffice,
      consultantPhoto: form.consultantPhoto,
      consultantOfficeLogo: form.consultantOfficeLogo,
      publishStatus: statusOverride ?? form.publishStatus,
      statsShowViews: form.statsShowViews,
      statsShowFavs: form.statsShowFavs,
      statsShowRating: form.statsShowRating,
      rating: form.rating,
      favoritesCount: form.favoritesCount,
      gallery: normGallery,
    };

    try {
      await saveListing(payload);
      setMessage("Kaydedildi.");
      router.refresh();
      if (!listing) router.push("/admin/ilanlar");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kayıt başarısız.");
    }
  }

  return (
    <div className="space-y-10 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="admin-page-title text-2xl font-extrabold md:text-3xl">{listing ? "İlanı düzenle" : "Yeni ilan oluştur"}</h1>
          <p className="mt-1 text-sm text-[var(--on-surface)]/55">Alanları doldurun, fotoğrafları bilgisayarınızdan seçin; kaydetmeyi unutmayın.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/ilan/${form.listingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-sm transition hover:bg-[var(--surface-container-low)]"
          >
            Sitede önizle
          </a>
          <button
            type="button"
            onClick={saveDraft}
            disabled={pending || uploadBusy}
            className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-semibold text-[var(--primary)] disabled:opacity-50"
          >
            Taslak kaydet
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={pending || uploadBusy}
            className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[var(--secondary)]/25 disabled:opacity-50"
          >
            Yayına al
          </button>
        </div>
      </div>
      {uploadHint ? <p className="text-sm font-medium text-[var(--brand)]">{uploadHint}</p> : null}
      {message ? (
        <p
          role={message.includes("Kaydedildi") ? "status" : "alert"}
          className={`text-sm font-medium ${message.includes("Kaydedildi") ? "text-emerald-700" : "text-red-700"}`}
        >
          {message}
        </p>
      ) : null}

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">İlan bilgileri</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">Başlık, fiyat ve konum burada.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            İlan kodu (sitedeki adres)
            <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.listingId} onChange={(e) => set("listingId", e.target.value)} />
            <span className="mt-1 block text-xs font-normal text-zinc-500">Yeni ilanda önerilen kodu kullanın; yayında değiştirmek bağlantıları etkileyebilir.</span>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            İlan başlığı
            <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            İlan türü
            <select className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="SATILIK">Satılık</option>
              <option value="KIRALIK">Kiralık</option>
              <option value="GUNLUK_KIRALIK">Günlük kiralık</option>
              <option value="PROJE">Proje</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            Mülk tipi
            <input
              className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20"
              placeholder="Örn. Daire, Villa"
              value={form.propertyType}
              onChange={(e) => set("propertyType", e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            Şehir (ilçe)
            <select
              className={LOCATION_SELECT_CLASS}
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({ ...f, city: e.target.value, region: "", neighborhood: "" }))
              }
            >
              <option value="">Seçiniz</option>
              {!cityInList && form.city ? (
                <option value={form.city}>{form.city} (kayıtlı — listeden seçin)</option>
              ) : null}
              {KKTC_ILCE_ADLARI.map((ad) => (
                <option key={ad} value={ad}>
                  {ad}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-[var(--on-surface)]/50">
              KKTC ilçeleri; sırayla bucak ve yerleşim seçilir
            </span>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            Bucak
            <select
              className={LOCATION_SELECT_CLASS}
              value={form.region}
              disabled={!form.city}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value, neighborhood: "" }))}
            >
              <option value="">{form.city ? "Seçiniz" : "Önce şehir seçin"}</option>
              {!regionInList && form.region ? (
                <option value={form.region}>{form.region} (kayıtlı — listeden seçin)</option>
              ) : null}
              {bucakAdlari.map((ad) => (
                <option key={ad} value={ad}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90 sm:col-span-2">
            Yerleşim yeri (mahalle)
            <select
              className={LOCATION_SELECT_CLASS}
              value={form.neighborhood}
              disabled={!form.city || !form.region}
              onChange={(e) => set("neighborhood", e.target.value)}
            >
              <option value="">{form.region ? "Seçiniz" : "Önce bucak seçin"}</option>
              {!neighborhoodInList && form.neighborhood ? (
                <option value={form.neighborhood}>{form.neighborhood} (kayıtlı — listeden seçin)</option>
              ) : null}
              {yerlesimler.map((ad) => (
                <option key={ad} value={ad}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90 sm:col-span-2">
            Tam adres (isteğe bağlı)
            <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.fullAddress} onChange={(e) => set("fullAddress", e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            Fiyat
            <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            Para birimi
            <select className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="EUR">EUR (€)</option>
              <option value="TRY">TRY (₺)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90 sm:col-span-2">
            Kısa özet (listelerde görünür)
            <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90 sm:col-span-2">
            Detaylı açıklama
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
              placeholder="İlan metnini buraya yazın."
              value={form.longDescription}
              onChange={(e) => set("longDescription", e.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">Özel biçimlendirme gerekirse ofisten yardım alabilirsiniz.</span>
          </label>
          <label className="block text-sm font-medium text-[var(--primary)]/90">
            Yayın durumu
            <select className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form.publishStatus} onChange={(e) => set("publishStatus", e.target.value)}>
              <option value="DRAFT">Taslak (sitede sadece siz görürsünüz)</option>
              <option value="PUBLISHED">Yayında (herkes görür)</option>
              <option value="HIDDEN">Gizli</option>
            </select>
          </label>
        </div>
      </section>

      <section className="admin-card border-2 border-dashed border-[var(--secondary)]/35 p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Fotoğraflar</h2>
        <p className="mt-1 text-sm text-zinc-600">
          İstediğiniz kadar resim ekleyebilirsiniz. Bilgisayarınızdan <strong>Ctrl</strong> veya <strong>Shift</strong> ile birden fazla dosyayı aynı anda seçin.
        </p>

        <div className="mt-6 space-y-6">
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-800">Kapak fotoğrafı</p>
            <p className="mt-0.5 text-xs text-zinc-500">Liste ve önizlemede ilk görünen görsel.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/20 transition hover:brightness-110 ${uploadBusy ? "pointer-events-none opacity-50" : ""}`}
              >
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.avif"
                  className="sr-only"
                  onChange={onCoverFileChange}
                  disabled={uploadBusy}
                />
                Bilgisayardan kapak seç
              </label>
              {form.coverImage.trim() ? (
                <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  <Image src={form.coverImage.trim()} alt="" fill className="object-cover" sizes="112px" unoptimized />
                </div>
              ) : (
                <span className="text-sm text-zinc-500">Henüz kapak yok</span>
              )}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">
                Bağlantı ile kapak eklemek istiyorum (isteğe bağlı)
              </summary>
              <input
                className="mt-2 w-full max-w-xl rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="https://..."
                value={form.coverImage}
                onChange={(e) => set("coverImage", e.target.value)}
              />
            </details>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-800">Galeri — tüm fotoğraflar</p>
            <p className="mt-0.5 text-xs text-zinc-500">Sınır yok; sırayı oklarla değiştirin. Yıldızlı olan kapak ile eşleşir.</p>
            <label
              className={`mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 ${uploadBusy ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                type="file"
                accept="image/*,.heic,.heif,.avif"
                multiple
                className="sr-only"
                onChange={onGalleryFilesChange}
                disabled={uploadBusy}
              />
              {uploadBusy ? "Yükleniyor…" : "Fotoğraf ekle (birden çok seçilebilir)"}
            </label>

            {gallery.filter((g) => g.url.trim()).length === 0 ? (
              <p className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">Henüz galeri fotoğrafı yok. Yukarıdaki düğmeyle ekleyin.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((g, idx) => {
                  const url = g.url.trim();
                  if (!url) return null;
                  return (
                    <li key={`${url}-${idx}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
                      <div className="relative aspect-[4/3] bg-zinc-200">
                        <Image src={url} alt="" fill className="object-cover" sizes="(max-width:640px) 50vw, 25vw" unoptimized />
                        {g.isPrimary ? (
                          <span className="absolute left-2 top-2 rounded bg-[var(--brand)] px-2 py-0.5 text-xs font-bold text-white">Kapak</span>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1 p-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40"
                            disabled={idx === 0}
                            onClick={() => moveGallery(idx, -1)}
                            title="Yukarı taşı"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40"
                            disabled={idx >= gallery.length - 1}
                            onClick={() => moveGallery(idx, 1)}
                            title="Aşağı taşı"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                            onClick={() => makeGalleryPrimary(idx)}
                          >
                            Kapak yap
                          </button>
                          <button type="button" className="ml-auto rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => removeGalleryRow(idx)}>
                            Sil
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Ev ve arsa özellikleri</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">Sayıları rakam olarak yazın; bilinmiyorsa boş bırakın.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["bedrooms", "bathrooms", "areaM2", "plotAreaM2", "floor", "buildingAge", "livingRooms"] as const).map((k) => (
            <label key={k} className="block text-sm font-medium text-[var(--primary)]/90">
              {PROPERTY_LABELS[k]}
              <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["hasPool", "Havuz"],
              ["hasGarden", "Bahçe"],
              ["hasFireplace", "Şömine"],
              ["hasParking", "Otopark"],
              ["furnished", "Eşyalı"],
              ["seaView", "Deniz manzarası"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          Harita koordinatları (enlem, boylam)
          <input
            className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm font-mono"
            placeholder="35.2501910, 33.0203320"
            value={form.coordinates}
            onChange={(e) => {
              const value = e.target.value;
              setForm((f) => {
                if (!value.trim()) {
                  return { ...f, coordinates: value, mapEnabled: false };
                }
                const parsed = parseLatLngPair(value);
                if (parsed && parsed.lat && parsed.lng) {
                  return { ...f, coordinates: value, mapEnabled: true };
                }
                return { ...f, coordinates: value };
              });
            }}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Virgülle ayırın; kayıtta ilan sayfasında haritada gösterilir (&quot;Harita göster&quot; açık kalmalı).
          </p>
        </label>
      </section>

      <section className="admin-card p-6">
        <details className="group">
          <summary className="cursor-pointer list-none font-headline text-base font-bold text-[var(--primary)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              İleri: ek fiyat / alan satırları (çoğu ilanda gerekmez)
              <span className="text-xs font-normal text-zinc-500 group-open:hidden">▼ göster</span>
              <span className="hidden text-xs font-normal text-zinc-500 group-open:inline">▲ gizle</span>
            </span>
          </summary>
          <p className="mt-2 text-sm text-zinc-500">Boş bırakılabilir. Sitedeki teknik tablo için kullanılır; değiştirmekten emin değilseniz dokunmayın.</p>
          <textarea
            className="mt-3 min-h-[180px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono"
            value={form.detailFields}
            onChange={(e) => set("detailFields", e.target.value)}
          />
        </details>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Rozetler</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">İlanda görünen etiketler.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["badgeFeatured", "Öne çıkan"],
              ["badgeExclusive", "Tek yetkili"],
              ["badgeVirtualTour", "Sanal tur"],
              ["badgeVideo", "Video"],
              ["badgeNew", "Yeni"],
              ["badgePriceDrop", "Fiyat düştü"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Öne çıkan maddeler</h2>
        <label className="mt-3 block text-sm font-medium text-[var(--primary)]/90">
          Her satıra bir madde yazın
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Her satıra bir madde (örn. Deniz manzarası)"
            value={form.featuresText}
            onChange={(e) => set("featuresText", e.target.value)}
          />
        </label>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Video, sanal tur ve harita</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">YouTube bağlantısı veya 360° tur adresi varsa buraya yapıştırın.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.virtualTourEnabled} onChange={(e) => set("virtualTourEnabled", e.target.checked)} />
            Sanal tur aktif
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.videoEnabled} onChange={(e) => set("videoEnabled", e.target.checked)} />
            Video aktif
          </label>
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Sanal tur bağlantısı"
            value={form.virtualTourUrl}
            onChange={(e) => set("virtualTourUrl", e.target.value)}
          />
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="YouTube video bağlantısı"
            value={form.videoUrl}
            onChange={(e) => set("videoUrl", e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.mapEnabled} onChange={(e) => set("mapEnabled", e.target.checked)} />
            Harita göster
          </label>
          <p className="text-xs text-zinc-500 sm:col-span-2">
            Koordinatları Özellikler bölümündeki &quot;Harita koordinatları&quot; alanına girin.
          </p>
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Yakındaki yerler</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">
          Harita koordinatına göre OpenStreetMap (Overpass) verisiyle doldurulur; sitede aşağıdaki öncelik sırasıyla listelenir. Kapattığınız
          kategori hiç gösterilmez.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-[var(--primary)]/90">
          <input type="checkbox" checked={form.nearbyEnabled} onChange={(e) => set("nearbyEnabled", e.target.checked)} />
          Sitede &quot;Yakında neler var?&quot; bölümünü göster
        </label>
        <p className="mt-2 text-xs text-[var(--on-surface)]/45">
          Ek API anahtarı gerekmez. Sonuçlar OpenStreetMap/Overpass servisinden çekilir.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {NEARBY_POI_CATEGORIES.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.poiCategories[c.id]}
                onChange={() => togglePoiCategory(c.id)}
              />
              <span>
                <span className="font-medium text-[var(--primary)]">{c.label}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-[var(--secondary)]/30 bg-[var(--surface-container-low)]/50 p-4">
          <p className="text-sm font-semibold text-[var(--primary)]">Sitede görünecek sıra (önizleme)</p>
          <NearbyPoiAdminPreview lat={previewCoords.lat} lng={previewCoords.lng} categories={form.poiCategories} />
        </div>
        <details className="group mt-6">
          <summary className="cursor-pointer list-none font-headline text-base font-bold text-[var(--primary)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              İleri: elle ek satırlar (JSON)
              <span className="text-xs font-normal text-zinc-500 group-open:hidden">▼</span>
              <span className="hidden text-xs font-normal text-zinc-500 group-open:inline">▲</span>
            </span>
          </summary>
          <p className="mt-2 text-xs text-[var(--on-surface)]/50">
            Otomatik listenin altında &quot;Ek bilgiler&quot; olarak gösterilir. Boş bırakılabilir.
          </p>
          <textarea
            className="mt-2 min-h-[100px] w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20"
            value={form.nearbyText}
            onChange={(e) => set("nearbyText", e.target.value)}
          />
        </details>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Danışman bilgileri</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">İlanla birlikte görünecek iletişim bilgileri.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["consultantName", "consultantPhone", "consultantWhatsapp", "consultantEmail", "consultantOffice", "consultantPhoto", "consultantOfficeLogo"] as const).map((k) => (
            <label key={k} className="block text-sm font-medium text-[var(--primary)]/90">
              {CONSULTANT_LABELS[k]}
              <input className="mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20" value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="font-headline text-lg font-bold text-[var(--primary)]">İstatistikler (sitede görünürlük)</h2>
        <p className="mt-1 text-sm text-[var(--on-surface)]/55">Genelde varsayılanları kullanmanız yeterli.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.statsShowViews} onChange={(e) => set("statsShowViews", e.target.checked)} />
            Gösterim
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.statsShowFavs} onChange={(e) => set("statsShowFavs", e.target.checked)} />
            Favori
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.statsShowRating} onChange={(e) => set("statsShowRating", e.target.checked)} />
            Puan
          </label>
          <input className="rounded border border-zinc-200 px-2 py-1 text-sm" placeholder="Puan" value={form.rating} onChange={(e) => set("rating", e.target.value)} />
          <input type="number" className="rounded border border-zinc-200 px-2 py-1 text-sm" placeholder="Favori sayısı" value={form.favoritesCount} onChange={(e) => set("favoritesCount", Number(e.target.value) || 0)} />
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--ghost-outline)] bg-[var(--surface-container-lowest)]/95 px-4 py-3 shadow-[0_-8px_32px_rgba(4,21,70,0.08)] backdrop-blur-md sm:left-64">
        <span className="hidden text-xs text-zinc-500 sm:inline">Kaydetmeyi unutmayın</span>
        <button
          type="button"
          onClick={saveDraft}
          disabled={pending || uploadBusy}
          className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-semibold text-[var(--primary)] disabled:opacity-50"
        >
          Taslak kaydet
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={pending || uploadBusy}
          className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[var(--secondary)]/25 disabled:opacity-50"
        >
          Yayına al
        </button>
      </div>
    </div>
  );
}
