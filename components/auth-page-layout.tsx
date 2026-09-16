import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";

export function AuthPageLayout({
  title,
  asset = "locked",
  backHref = "/auth",
  backLabel = "Back to sign in",
  story,
  children,
}: {
  title: string;
  asset?: FolvetaAsset;
  backHref?: string;
  backLabel?: string;
  story?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-page min-h-[100dvh] bg-[var(--background)] px-5 pb-10 sm:px-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <header className="auth-page__header flex min-h-[88px] items-center justify-between gap-4 py-5">
          <BrandMark />
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--foreground)]">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            {backLabel}
          </Link>
        </header>
        <div className="auth-page__layout grid items-center gap-8 pb-6 pt-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:py-10">
          <section className="auth-page__story order-2 min-w-0 text-center lg:order-1 lg:text-left">
            <div className="auth-page__art mx-auto flex aspect-square w-[180px] items-center justify-center rounded-[44px] bg-[var(--primary-soft)] sm:w-[230px] lg:w-[320px]">
              <AssetIllustration asset={asset} priority className="w-full" sizes="(max-width: 1023px) 230px, 320px" />
            </div>
            {story}
          </section>
          <section className="auth-page__form order-1 mx-auto w-full max-w-[440px] rounded-[28px] border-2 border-[var(--border-soft)] bg-[var(--surface)] p-6 sm:p-8 lg:order-2">
            <p className="text-label-sm text-[var(--primary)]">Folveta account</p>
            <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.025em] text-[var(--foreground)]">{title}</h1>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
