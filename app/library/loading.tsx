import { FolderOpen } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Progress } from "@/components/ui/feedback";

export default function LibraryLoading() {
  return <WorkspaceShell active="library"><div className="mx-auto max-w-[960px] py-16"><div className="flex items-center gap-3 text-[var(--muted)]"><FolderOpen className="h-5 w-5" /><p>Loading your source materials...</p></div><Progress label="Loading Library" /></div></WorkspaceShell>;
}
