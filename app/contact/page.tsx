import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Folveta support for help with Study Guides, subscriptions, or privacy requests.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
          <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Contact</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">Support for Folveta</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">For product help, subscription questions, refund requests, or privacy requests, email our support team.</p>
          <a className="mt-10 inline-flex items-center gap-3 rounded-lg border border-[var(--line)] bg-white px-5 py-4 font-semibold text-[var(--accent)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]" href="mailto:yumao3623@gmail.com"><Mail className="h-5 w-5" />yumao3623@gmail.com</a>
          <p className="mt-8 max-w-2xl leading-7 text-stone-700">Please include the email associated with your Folveta account or subscription when relevant. Do not send sensitive course material or payment-card details by email.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
