import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClassName, cn } from "@/components/ui/styles";
import { BrandMark } from "@/components/brand-mark";
import { CartoonIcon, type CartoonIconName } from "@/components/ui/cartoon-icon";

type WorkspaceRoute = "guides" | "library" | "search" | "profile";

const navigation = [
  { id: "guides", href: "/my-guides", label: "My Guides", mobileLabel: "Guides", icon: "guide" },
  { id: "library", href: "/library", label: "Library", icon: "library" },
  { id: "search", href: "/search", label: "Search", icon: "search" },
  { id: "profile", href: "/profile", label: "Profile", icon: "profile" },
] as const;

function WorkspaceNavigation({ active, mobile = false }: { active: WorkspaceRoute; mobile?: boolean }) {
  return (
    <nav
      className={mobile ? "grid w-full grid-cols-4 gap-1 px-3 pb-3" : "space-y-1.5 px-3"}
      aria-label="Workspace"
    >
      {navigation.map((item) => {
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active === item.id ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
              mobile && "justify-center gap-1.5 px-1.5 text-[13px]",
              active === item.id
                ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                : "text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
            )}
          >
            <CartoonIcon name={item.icon as CartoonIconName} size={22} animated={active === item.id} />
            {mobile && "mobileLabel" in item ? item.mobileLabel : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceShell({ active, children }: { active: WorkspaceRoute; children: ReactNode }) {
  return (
    <div className="workspace-shell min-h-screen bg-[var(--background)]">
      <aside className="workspace-shell__sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--border-soft)] bg-[var(--surface-container-low)] xl:flex">
        <div className="px-6 pb-7 pt-8">
          <BrandMark />
          <p className="mt-1 text-[12px] text-[var(--muted)]">Private study workspace</p>
        </div>
        <WorkspaceNavigation active={active} />
        <div className="mt-auto border-t border-[var(--border-soft)] p-5">
          <Link href="/#upload" className={buttonClassName({ className: "w-full" })}>
            <CartoonIcon name="upload" size={20} /> New Guide
          </Link>
        </div>
      </aside>

      <div className="workspace-shell__main">
        <header className="workspace-shell__mobile-header border-b border-[var(--border-soft)] bg-[var(--surface)] xl:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <BrandMark compact />
            <Link href="/#upload" className={buttonClassName({ size: "sm" })}>
              <CartoonIcon name="upload" size={18} /> New Guide
            </Link>
          </div>
          <WorkspaceNavigation active={active} mobile />
        </header>
        <main className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
