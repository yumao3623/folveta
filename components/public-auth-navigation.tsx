"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { StudyIcon } from "@/components/ui/study-icon";
import { buttonClassName } from "@/components/ui/styles";
import { usePublicViewer } from "@/components/public-viewer";

export function PublicAuthNavigation() {
  const { viewer, status } = usePublicViewer();
  return <div className="site-header__account" aria-busy={status === "loading"}>
    {viewer?.user ? <>
      <Link href="/my-guides" prefetch={false} className={buttonClassName({ variant: "ghost", size: "sm" })} aria-label="Open My Guides">
        <StudyIcon name="guide" size={24} /><span className="hidden md:inline">My Guides</span>
      </Link>
      <Link href="/profile" prefetch={false} className={buttonClassName({ variant: "ghost", size: "sm" })} aria-label="Open Profile" title="Profile">
        <StudyIcon name="profile" size={24} /><span className="hidden md:inline">Profile</span>
      </Link>
    </> : <Link href="/auth" prefetch={false} className={buttonClassName({ variant: "ghost", size: "sm" })}>
      <LogIn className="h-[18px] w-[18px]" strokeWidth={2.5} />Sign in
    </Link>}
  </div>;
}
