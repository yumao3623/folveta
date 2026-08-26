"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function MyGuidesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-12">
      <div className="mx-auto max-w-xl">
        <Alert tone="destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div><h1 className="font-semibold">My Guides could not load</h1><p className="mt-1 text-sm">Your data was not changed. Retry the private list request.</p></div>
          </div>
        </Alert>
        <Button className="mt-5" onClick={reset}>Retry</Button>
      </div>
    </main>
  );
}
