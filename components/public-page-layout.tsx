import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";
import { buttonClassName } from "@/components/ui/styles";

export function PublicPageLayout({
  label,
  title,
  description,
  asset,
  updated,
  actions,
  children,
}: {
  label: string;
  title: string;
  description?: ReactNode;
  asset: FolvetaAsset;
  updated?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="public-page flex min-h-[100dvh] flex-col bg-[var(--background)]">
      <main className="flex-1">
        <header className="public-page__header mx-auto flex w-full max-w-[1140px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <BrandMark />
          <nav className="flex shrink-0 items-center gap-2 sm:gap-4" aria-label="Public pages">
            <Link href="/study/demo" className={buttonClassName({ variant: "ghost", size: "sm" })}>Example guide</Link>
            <Link href="/auth" className={buttonClassName({ variant: "secondary", size: "sm" })}>Sign in</Link>
          </nav>
        </header>
        <div className="mx-auto w-full max-w-[1140px] px-5 sm:px-8">
          <section className="public-page__hero grid items-center gap-6 py-8 md:grid-cols-[minmax(0,1fr)_260px] md:gap-10 md:py-12">
            <div className="public-page__copy min-w-0">
              <p className="text-label-sm text-[var(--primary)]">{label}</p>
              <h1 className="mt-3 max-w-[760px] text-[clamp(2rem,4.3vw,3.25rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--foreground)]">{title}</h1>
              {description ? <div className="mt-5 max-w-[680px] text-lg leading-8 text-[var(--text-secondary)]">{description}</div> : null}
              {updated ? <p className="mt-5 text-sm font-medium text-[var(--text-muted)]">{updated}</p> : null}
              {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
            </div>
            <div className="public-page__art mx-auto flex aspect-square w-[180px] items-center justify-center rounded-[40px] bg-[var(--primary-soft)] sm:w-[220px] md:w-full">
              <AssetIllustration asset={asset} priority className="w-full" sizes="(max-width: 767px) 220px, 260px" />
            </div>
          </section>
          <div className="public-page__content pb-14 sm:pb-20">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
