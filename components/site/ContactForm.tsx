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
    sending: string;
  };
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  function set(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await submitContactMessage(form);
      setStatus("sent");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-primary/10 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition";

  if (status === "sent") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-10 text-center shadow-[var(--shadow-ambient)] ring-1 ring-emerald-200">
        <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
        <p className="mt-3 font-headline text-lg font-bold text-emerald-800">{labels.successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-surface-lowest p-8 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.12]">
      <p className="font-headline text-lg font-bold text-primary">{labels.formTitle}</p>
      <p className="mt-2 text-sm leading-relaxed text-on-surface/50">{labels.formSubtitle}</p>
      <div className="mt-6 space-y-4">
        <input
          className={inputCls}
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={labels.namePlaceholder}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={labels.emailPlaceholder}
          />
          <input
            className={inputCls}
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
      {status === "error" && (
        <p className="mt-3 text-sm font-medium text-red-600">{labels.errorMessage}</p>
      )}
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
