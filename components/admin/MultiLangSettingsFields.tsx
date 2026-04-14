"use client";

import { useState } from "react";

type Locale = "tr" | "en" | "ru" | "de" | "fa";

interface Props {
  initialTranslations: any;
  currentSettings: any;
}

export function MultiLangSettingsFields({ initialTranslations, currentSettings }: Props) {
  const [activeTab, setActiveTab] = useState<Locale>("tr");
  const locales: { code: Locale; label: string }[] = [
    { code: "tr", label: "Türkçe (Varsayılan)" },
    { code: "en", label: "English" },
    { code: "ru", label: "Русский" },
    { code: "de", label: "Deutsch" },
    { code: "fa", label: "فارسی" },
  ];

  const translations = initialTranslations || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-(--ghost-outline)">
        {locales.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setActiveTab(l.code)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === l.code
                ? "border-secondary text-secondary"
                : "border-transparent text-(--on-surface)/50 hover:text-on-surface"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {locales.map((l) => {
          const isDefault = l.code === "tr";
          const data = isDefault ? (currentSettings || {}) : (translations[l.code] || {});

          return (
            <div key={l.code} className={activeTab === l.code ? "block space-y-8" : "hidden"}>
              <section className="admin-card space-y-4 p-6">
                <h3 className="label-sm font-bold text-primary">Genel Metinler ({l.label})</h3>
                <div className="grid gap-4">
                  <label className="block text-sm">
                    Site Adı
                    <input
                      name={isDefault ? "siteName" : `siteName_${l.code}`}
                      defaultValue={data.siteName || ""}
                      className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                  <label className="block text-sm">
                    Hero Başlık
                    <input
                      name={isDefault ? "heroTitle" : `heroTitle_${l.code}`}
                      defaultValue={data.heroTitle || ""}
                      className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                  <label className="block text-sm">
                    Hero Alt Başlık
                    <textarea
                      name={isDefault ? "heroSubtitle" : `heroSubtitle_${l.code}`}
                      defaultValue={data.heroSubtitle || ""}
                      className="mt-1 min-h-18 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                  <label className="block text-sm">
                    Footer Hakkımızda
                    <textarea
                      name={isDefault ? "footerAbout" : `footerAbout_${l.code}`}
                      defaultValue={data.footerAbout || ""}
                      className="mt-1 min-h-18 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                  <label className="block text-sm">
                    Adres
                    <textarea
                      name={isDefault ? "address" : `address_${l.code}`}
                      defaultValue={data.address || ""}
                      className="mt-1 min-h-18 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                </div>
              </section>

              <section className="admin-card space-y-4 p-6">
                <h3 className="label-sm font-bold text-primary">SEO ({l.label})</h3>
                <div className="grid gap-4">
                  <label className="block text-sm">
                    Meta Başlık
                    <input
                      name={isDefault ? "seoTitle" : `seoTitle_${l.code}`}
                      defaultValue={data.seoTitle || ""}
                      className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                  <label className="block text-sm">
                    Meta Açıklama
                    <textarea
                      name={isDefault ? "seoDescription" : `seoDescription_${l.code}`}
                      defaultValue={data.seoDescription || ""}
                      className="mt-1 min-h-18 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                    />
                  </label>
                </div>
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
