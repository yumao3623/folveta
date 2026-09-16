import Link from "next/link";
import { LogIn } from "lucide-react";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
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
        <CartoonIcon name="guide" size={24} />
        <span className="hidden md:inline">My Guides</span>
      </Link>
      <Link
        href="/profile"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
        aria-label="Open Profile"
        title="Profile"
      >
        <CartoonIcon name="profile" size={24} />
        <span className="hidden md:inline">Profile</span>
      </Link>
    </>
  ) : (
    <Link
      href={nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : "/auth"}
      className={buttonClassName({ variant: "ghost", size: "sm" })}
    >
      <LogIn className="h-[18px] w-[18px]" strokeWidth={2.5} />
      Sign in
    </Link>
  );
}
