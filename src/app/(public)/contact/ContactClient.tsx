"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const INFO_CARDS = [
  {
    title: "Phone",
    desc: "Call or text us directly for urgent questions.",
    contact: "+1 (773) 715-6402",
    href: "tel:+17737156402",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    title: "General Support",
    desc: "Questions about your account, transactions, or the platform.",
    contact: "support@accsmarkets.org",
    href: "mailto:support@accsmarkets.org",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: "Disputes & Escrow",
    desc: "Issues with an active escrow or need help with a dispute.",
    contact: "disputes@accsmarkets.org",
    href: "mailto:disputes@accsmarkets.org",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    title: "Business & Partnerships",
    desc: "Interested in integrating or partnering with AccsMarkets.",
    contact: "business@accsmarkets.org",
    href: "mailto:business@accsmarkets.org",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const FAQ = [
  { q: "How long do you take to respond?", a: "We aim to respond within 24 hours on business days. Dispute-related messages are prioritized." },
  { q: "Can I call you?", a: "Yes — call or text +1 (773) 715-6402. For dispute-related issues, email or the contact form is still the fastest route since we can attach it to your case." },
  { q: "I have a dispute — should I use this form?", a: "For active escrow disputes, use the dispute button on your escrow page. For general dispute questions, this form works." },
];

export default function ContactClient() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <span className="inline-block rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 mb-4">
          Contact
        </span>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Get in Touch</h1>
        <p className="mt-3 mx-auto max-w-lg text-muted">
          Questions, feedback, or a deal that needs attention — we&apos;re here to help.
        </p>
      </motion.div>

      {/* Info cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {INFO_CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
            className="rounded-2xl border border-surface-border bg-background p-5 hover:border-brand-200 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
              {card.icon}
            </div>
            <h3 className="font-semibold text-foreground text-sm">{card.title}</h3>
            <p className="mt-1 text-xs text-muted">{card.desc}</p>
            <a href={card.href} className="mt-2 block text-xs font-medium text-brand-600 hover:underline">{card.contact}</a>
          </motion.div>
        ))}
      </motion.div>

      {/* Form + FAQ */}
      <div className="mt-12 grid gap-8 lg:grid-cols-5">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="lg:col-span-3 rounded-2xl border border-surface-border bg-background p-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">Send a Message</h2>
          {sent ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-foreground">Message sent!</p>
              <p className="mt-1 text-sm text-muted">We&apos;ll get back to you within 24–48 hours.</p>
              <button
                onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <Input label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <Textarea label="Message" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <Button type="submit" isLoading={loading} className="w-full">
                Send message
              </Button>
            </form>
          )}
        </motion.div>

        {/* FAQ sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="lg:col-span-2"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">FAQ</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border border-surface-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{item.q}</h3>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-brand-200 bg-brand-500/10 p-4">
            <h3 className="text-sm font-semibold text-brand-700">Response Time</h3>
            <p className="mt-1 text-xs text-brand-600">
              We respond within 24 hours on business days. Disputes and security issues are prioritized.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
