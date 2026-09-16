import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Progress } from "@/components/ui/feedback";

export default function LibraryLoading() {
  return <WorkspaceShell active="library"><div className="mx-auto max-w-[960px] py-16"><div className="mb-5 flex items-center gap-4 text-[var(--muted)]" role="status"><CartoonIcon name="loading" size={48} animated /><p>Loading your source materials...</p></div><Progress label="Loading Library" /></div></WorkspaceShell>;
}
