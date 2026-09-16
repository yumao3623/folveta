"use client";

import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function SearchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <WorkspaceShell active="search"><div className="mx-auto max-w-xl py-12"><Alert tone="destructive" icon={false}><div className="flex items-start gap-4"><CartoonIcon name="error" size={48} animated /><div><h1 className="text-xl font-bold">Search could not load</h1><p className="mt-2 text-sm leading-6">No private result was exposed. Retry the search request.</p></div></div></Alert><Button className="mt-5" onClick={reset}>Retry</Button></div></WorkspaceShell>;
}
