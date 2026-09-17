"use client";

import { useEffect, useState } from "react";
import { GuideSummaryCard } from "@/components/guide-summary-card";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClassName } from "@/components/ui/styles";
import { StudyIcon } from "@/components/ui/study-icon";
import { AssetIllustration } from "@/components/ui/asset-illustration";
import type { PublicViewer } from "@/lib/public-viewer";
import type { GuideSummary } from "@/lib/server/guides";

export default function RecentGuideList({ viewer }: { viewer: PublicViewer }) {
  const [result, setResult] = useState<{ guides: GuideSummary[]; error: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/guides?limit=4", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Guides unavailable");
        const data: { guides: GuideSummary[] } = await response.json();
        if (active) setResult({ guides: data.guides, error: false });
      } catch {
        if (active) setResult({ guides: [], error: true });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [viewer]);

  if (!result) return <p role="status" className="py-10 text-center text-[var(--muted)]">Loading your Guides…</p>;
  if (result.error) return <p role="alert" className="py-10 text-center text-[var(--muted)]">Your Guides could not load. <button className="text-link underline" onClick={() => window.location.reload()}>Try again</button></p>;
  return result.guides.length ? <div className="grid gap-4 md:grid-cols-2">
    {result.guides.map((guide) => <GuideSummaryCard key={guide.id} guide={guide} manage={false} />)}
  </div> : <EmptyState
    icon={<AssetIllustration asset="guide" sizes="96px" />}
    title="No Guides yet"
    description="Create a Guide from your own course materials and it will appear here."
    action={<a href="#upload" className={buttonClassName({ size: "sm" })}><StudyIcon name="upload" size={20} /> Create Guide</a>}
  />;
}
