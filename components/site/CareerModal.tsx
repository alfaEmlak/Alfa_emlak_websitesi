"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitCareerApplication } from "@/app/karealfaadmin/career-actions";

const ALLOWED_EXT_RE = /\.(pdf|doc|docx)$/i;
const MAX_SIZE = 5 * 1024 * 1024;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CareerModal({ open, onClose }: Props) {
  const t = useTranslations("Career");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<{ url: string; path: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal kapanırken state'i sıfırla
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setCv(null);
    setFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (submitting || uploading) return;
    reset();
    onClose();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_EXT_RE.test(file.name)) {
      setFeedback({ type: "error", text: t("errors.invalidFile") });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setFeedback({ type: "error", text: t("errors.fileTooLarge") });
      e.target.value = "";
      return;
    }

    setFeedback(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-cv", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; path?: string; filename?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || t("errors.uploadFailed"));
      }
      setCv({ url: data.url, path: data.path || "", filename: data.filename || file.name });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : t("errors.uploadFailed"),
      });
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await submitCareerApplication({
        firstName,
        lastName,
        email,
        phone,
        message,
        cvUrl: cv?.url,
        cvPath: cv?.path,
        cvFilename: cv?.filename,
      });
      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        return;
      }
      setFeedback({ type: "success", text: t("success") });
      setTimeout(() => {
        reset();
        onClose();
      }, 2000);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : t("errors.submitFailed"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="career-modal-title"
    >
      <div
        className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="career-modal-title" className="font-headline text-xl font-extrabold text-primary">
              {t("title")}
            </h2>
            <p className="mt-1 text-xs text-on-surface/60">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting || uploading}
            className="ml-4 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-primary transition hover:bg-slate-200 disabled:opacity-40"
            aria-label={t("close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-primary/80">
              {t("firstName")} *
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              />
            </label>
            <label className="block text-sm font-semibold text-primary/80">
              {t("lastName")} *
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-primary/80">
            {t("email")} *
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </label>

          <label className="block text-sm font-semibold text-primary/80">
            {t("phone")} *
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </label>

          <label className="block text-sm font-semibold text-primary/80">
            {t("message")}
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </label>

          <div>
            <label className="block text-sm font-semibold text-primary/80">{t("cv")}</label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2.5 text-sm font-semibold transition ${
                  uploading
                    ? "pointer-events-none opacity-50 border-slate-200 text-on-surface/50"
                    : "border-secondary/40 text-secondary hover:bg-secondary/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={onFileChange}
                  disabled={uploading || submitting}
                />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 shrink-0" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                {uploading ? t("uploading") : cv ? t("changeCv") : t("uploadCv")}
              </label>
              {cv ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="max-w-[200px] truncate">{cv.filename}</span>
                </div>
              ) : (
                <span className="text-xs text-on-surface/50">{t("cvHint")}</span>
              )}
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting || uploading}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary/80 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-secondary/25 transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
