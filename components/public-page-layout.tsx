import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";

export function PublicPageLayout({
  label,
  title,
  description,
  asset,
  updated,
  actions,
  breadcrumbLabel,
  heroDensity = "standard",
  pageClassName,
  children,
}: {
  label: string;
  title: string;
  description?: ReactNode;
  asset: FolvetaAsset;
  updated?: string;
  actions?: ReactNode;
  breadcrumbLabel?: string;
  heroDensity?: "standard" | "compact";
  pageClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={`public-page public-page--${heroDensity} flex min-h-[100dvh] flex-col ${pageClassName ?? ""}`}>
      <main className="flex-1">
        <SiteHeader />
        <div className="mx-auto w-full max-w-[1140px] px-5 sm:px-8">
          {breadcrumbLabel ? (
            <nav aria-label="Breadcrumb" className="pt-4 text-sm text-[var(--text-muted)]">
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link href="/" className="underline underline-offset-4">Folveta</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{breadcrumbLabel}</li>
              </ol>
            </nav>
          ) : null}
          <section className="public-page__hero grid items-center gap-6 py-8 md:grid-cols-[minmax(0,1fr)_260px] md:gap-10 md:py-12">
            <div className="public-page__copy min-w-0">
              <p className="text-label-sm text-[var(--primary)]">{label}</p>
              <h1 className="mt-3 max-w-[760px] text-[clamp(2rem,4.3vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.022em] text-[var(--foreground)]">{title}</h1>
              {description ? <div className="mt-5 max-w-[680px] text-lg leading-8 text-[var(--text-secondary)]">{description}</div> : null}
              {updated ? <p className="mt-5 text-sm font-medium text-[var(--text-muted)]">{updated}</p> : null}
              {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
            </div>
            <div className="public-page__art mx-auto flex aspect-square w-[180px] items-center justify-center sm:w-[220px] md:w-full">
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
