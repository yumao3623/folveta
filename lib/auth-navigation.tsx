import Link from "next/link";
import { BookOpen, CircleUserRound, LogIn } from "lucide-react";
import { buttonClassName } from "@/components/ui/styles";
import { getCurrentUser } from "@/lib/server/auth";

export async function AuthNavigation({ nextPath }: { nextPath?: string } = {}) {
  const user = await getCurrentUser();
  return user ? (
    <>
      <Link
        href="/my-guides"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
        aria-label="Open My Guides"
      >
        <BookOpen className="h-[17px] w-[17px]" strokeWidth={1.8} />
        <span className="hidden md:inline">My Guides</span>
      </Link>
      <Link
        href="/account"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
        aria-label="Open account"
      >
        <CircleUserRound className="h-[17px] w-[17px]" strokeWidth={1.8} />
        <span className="hidden md:inline">Account</span>
      </Link>
    </>
  ) : (
    <Link
      href={nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : "/auth"}
      className={buttonClassName({ variant: "ghost", size: "sm" })}
    >
      <LogIn className="h-[17px] w-[17px]" strokeWidth={1.8} />
      Sign in
    </Link>
  );
}
