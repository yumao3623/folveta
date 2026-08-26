"use client";

import { AlertCircle } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function SearchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <WorkspaceShell active="search"><div className="mx-auto max-w-xl py-12"><Alert tone="destructive"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><h1 className="font-semibold">Search could not load</h1><p className="mt-1 text-sm">No private result was exposed. Retry the search request.</p></div></div></Alert><Button className="mt-5" onClick={reset}>Retry</Button></div></WorkspaceShell>;
}
