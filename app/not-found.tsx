import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { buttonClassName } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
      <BrandMark />
      <section className="py-14 text-center">
        <CartoonIcon name="search" size={112} />
        <p className="mt-5 text-label-sm text-[var(--muted)]">404</p>
        <h1 className="mt-2 text-3xl font-extrabold">This page could not be found.</h1>
        <Link href="/" className={buttonClassName({ size: "lg", className: "mt-7" })}>Back to Folveta</Link>
      </section>
    </main>
  );
}
