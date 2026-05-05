"use client";

import { useState } from "react";
import { submitContactMessage } from "@/app/karealfaadmin/module-actions";

export function ContactForm({ labels }: {
  labels: {
    formTitle: string;
    formSubtitle: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    subjectPlaceholder: string;
    messagePlaceholder: string;
    sendButton: string;
    successMessage: string;
    errorMessage: string;
    validationNamePhone: string;
    sending: string;
  };
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorKind, setErrorKind] = useState<"validation" | "generic" | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  function set(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorKind(null);
    const name = form.name.trim();
    const msg = form.message.trim();
    const phoneDigits = form.phone.replace(/\D/g, "");
    // noValidate: tarayıcı "required"ı yalnızca boş stringde reddeder; sadece boşluk veya rakamsız telefon geçmesin.
    if (name.length < 2 || phoneDigits.length < 7 || msg.length < 1) {
      setErrorKind("validation");
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await submitContactMessage({ ...form, name, message: msg });
      if (!res.ok) {
        setErrorKind("validation");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setErrorKind(null);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setErrorKind("generic");
      setStatus("error");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-primary/10 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition min-h-[44px]";

  if (status === "sent") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-10 text-center shadow-[var(--shadow-ambient)] ring-1 ring-emerald-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto h-16 w-16 text-emerald-600"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <p className="mt-4 font-headline text-lg font-bold text-emerald-800">{labels.successMessage}</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-2xl bg-surface-lowest p-8 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.12]">
      <p className="font-headline text-lg font-bold text-primary">{labels.formTitle}</p>
      <p className="mt-2 text-sm leading-relaxed text-on-surface/50">{labels.formSubtitle}</p>
      <div className="mt-6 space-y-4">
        <input
          className={inputCls}
          name="contact-name"
          autoComplete="name"
          required
          minLength={2}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={labels.namePlaceholder}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className={inputCls}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={labels.emailPlaceholder}
          />
          <input
            className={inputCls}
            type="tel"
            name="contact-phone"
            autoComplete="tel"
            required
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder={labels.phonePlaceholder}
          />
        </div>
        <input
          className={inputCls}
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder={labels.subjectPlaceholder}
        />
        <textarea
          className={inputCls}
          required
          rows={5}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder={labels.messagePlaceholder}
        />
      </div>
      {status === "error" && errorKind ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          {errorKind === "validation" ? labels.validationNamePhone : labels.errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-tactile mt-6 w-full rounded-xl bg-secondary px-8 py-4 font-headline text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-secondary/20 transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "sending" ? labels.sending : labels.sendButton}
      </button>
    </form>
  );
}
