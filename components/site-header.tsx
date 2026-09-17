import Link from "next/link";
import { AuthNavigation } from "@/lib/auth-navigation";
import { BrandMark } from "@/components/brand-mark";
import { buttonClassName } from "@/components/ui/styles";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandMark />
        <nav className="site-header__nav" aria-label="Primary navigation">
          <Link href="/about" className="site-header__link">About</Link>
          <Link href="/pricing" className="site-header__link">Pricing</Link>
          <Link href="/study/demo" className={buttonClassName({ variant: "secondary", size: "sm", className: "site-header__example" })}>
            Example guide
          </Link>
          <AuthNavigation />
        </nav>
      </div>
    </header>
  );
}
