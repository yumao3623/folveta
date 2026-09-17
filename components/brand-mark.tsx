import Image from "next/image";
import Link from "next/link";

export function BrandMark({
  href = "/",
  compact = false,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Folveta home">
      <Image
        src="/brand/folveta-mark.svg"
        alt=""
        width={compact ? 36 : 42}
        height={compact ? 36 : 42}
        priority
      />
      <span className="brand-mark__wordmark font-headline-md text-[23px] font-bold tracking-[-0.02em] text-[var(--foreground)]">Folveta</span>
    </Link>
  );
}
