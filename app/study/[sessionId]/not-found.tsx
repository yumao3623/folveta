import Link from "next/link";
import { buttonClassName } from "@/components/ui/styles";
import { BrandMark } from "@/components/brand-mark";
import { AssetIllustration } from "@/components/ui/asset-illustration";

export default function SessionNotFound() {
  return <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
    <BrandMark />
    <section className="py-10 text-center">
    <AssetIllustration asset="locked" className="mx-auto" sizes="192px" />
    <h1 className="mt-6 text-3xl font-extrabold text-[var(--foreground)]">This study session is unavailable.</h1>
    <p className="mt-4 leading-7 text-[var(--muted)]">It may have expired, or this browser does not hold its private access token.</p>
    <Link href="/" className={buttonClassName({ size: "lg", className: "mt-7" })}>Start a new guide</Link>
    </section>
  </main>;
}
