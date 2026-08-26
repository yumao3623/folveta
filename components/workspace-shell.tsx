import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, FolderOpen, Plus, Search, UserRound } from "lucide-react";
import { buttonClassName, cn } from "@/components/ui/styles";

type WorkspaceRoute = "guides" | "library" | "search" | "profile";

const navigation = [
  { id: "guides", href: "/my-guides", label: "My Guides", mobileLabel: "Guides", icon: BookOpen },
  { id: "library", href: "/library", label: "Library", icon: FolderOpen },
  { id: "search", href: "/search", label: "Search", icon: Search },
  { id: "profile", href: "/profile", label: "Profile", icon: UserRound },
] as const;

function WorkspaceNavigation({ active, mobile = false }: { active: WorkspaceRoute; mobile?: boolean }) {
  return (
    <nav
      className={mobile ? "grid w-full grid-cols-4 gap-1 px-3 pb-3" : "space-y-1.5 px-3"}
      aria-label="Workspace"
    >
      {navigation.map((item) => {
        const Icon = item.icon;
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
            <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
            {mobile && "mobileLabel" in item ? item.mobileLabel : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceShell({ active, children }: { active: WorkspaceRoute; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border-soft)] bg-[var(--surface-container-low)] lg:flex">
        <div className="px-6 pb-7 pt-8">
          <Link href="/" className="font-headline-md text-[24px] font-semibold text-[var(--primary)]">Folveta</Link>
          <p className="mt-1 text-[12px] text-[var(--muted)]">Private study workspace</p>
        </div>
        <WorkspaceNavigation active={active} />
        <div className="mt-auto border-t border-[var(--border-soft)] p-5">
          <Link href="/#upload" className={buttonClassName({ className: "w-full" })}>
            <Plus className="h-4 w-4" strokeWidth={1.8} /> New Guide
          </Link>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="border-b border-[var(--border-soft)] bg-[var(--surface)] lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <Link href="/" className="font-headline-md text-[22px] font-semibold text-[var(--primary)]">Folveta</Link>
            <Link href="/#upload" className={buttonClassName({ size: "sm" })}>
              <Plus className="h-4 w-4" /> New Guide
            </Link>
          </div>
          <WorkspaceNavigation active={active} mobile />
        </header>
        <main className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
