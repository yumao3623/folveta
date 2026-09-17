"use client";

import { StudyIcon } from "@/components/ui/study-icon";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <WorkspaceShell active="profile"><div className="mx-auto max-w-xl py-12"><Alert tone="destructive" icon={false}><div className="flex items-start gap-4"><StudyIcon name="error" size={24} animated /><div><h1 className="text-xl font-bold">Profile could not load</h1><p className="mt-2 text-sm leading-6">No account data was exposed. Retry the private request.</p></div></div></Alert><Button className="mt-5" onClick={reset}>Retry</Button></div></WorkspaceShell>;
}
