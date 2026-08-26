import { Search } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Progress } from "@/components/ui/feedback";

export default function SearchLoading() {
  return <WorkspaceShell active="search"><div className="mx-auto max-w-[880px] py-16"><div className="flex items-center gap-3 text-[var(--muted)]"><Search className="h-5 w-5" /><p>Searching your workspace...</p></div><Progress label="Searching your workspace" /></div></WorkspaceShell>;
}
