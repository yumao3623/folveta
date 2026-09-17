import Link from "next/link";
import { LogIn } from "lucide-react";
import { StudyIcon } from "@/components/ui/study-icon";
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
        <StudyIcon name="guide" size={24} />
        <span className="hidden md:inline">My Guides</span>
      </Link>
      <Link
        href="/profile"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
        aria-label="Open Profile"
        title="Profile"
      >
        <StudyIcon name="profile" size={24} />
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
