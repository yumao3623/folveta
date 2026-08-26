import { UserRound } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Progress } from "@/components/ui/feedback";

export default function ProfileLoading() {
  return <WorkspaceShell active="profile"><div className="mx-auto max-w-[800px] py-16"><div className="flex items-center gap-3 text-[var(--muted)]"><UserRound className="h-5 w-5" /><p>Loading your account...</p></div><Progress label="Loading Profile" /></div></WorkspaceShell>;
}
