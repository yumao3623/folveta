"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";

const stages = [
  {
    label: "Bring your material",
    eyebrow: "01 · Add material",
    detail: "Your course files stay together and visible.",
    illustration: "material",
  },
  {
    label: "See what matters",
    eyebrow: "02 · Build a Guide",
    detail: "Topics, priorities, and source references become a clear path.",
    illustration: "guide",
  },
  {
    label: "Check your recall",
    eyebrow: "03 · Quick Check",
    detail: "A short practice round points you back to what needs review.",
    illustration: "quick-check",
  },
] as const;

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function StudyLoopPreview() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useSyncExternalStore(subscribeToMotion, () => window.matchMedia(motionQuery).matches, () => false);
  const isPlaying = playing && !reduced;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % stages.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const stage = stages[active];

  return (
    <section className="study-loop" aria-label="Folveta study workflow preview">
      <div className="study-loop__heading"><div><span className="ui-badge ui-badge--source">Workflow preview</span><h2>From file pile to next step.</h2></div><button type="button" className="ui-button ui-button--secondary ui-button--icon" disabled={reduced} title={reduced ? "Autoplay is paused by your reduced-motion preference" : undefined} aria-label={isPlaying ? "Pause workflow preview" : "Play workflow preview"} onClick={() => setPlaying((current) => !current)}>{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button></div>
      <div className="study-loop__steps">
        {stages.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => { setActive(index); setPlaying(false); }}
            className="flow-stage"
            aria-pressed={active === index}
          >
            <AssetIllustration decorative asset={item.illustration as FolvetaAsset} className="flow-stage__art" sizes="(max-width: 640px) 80px, 150px" />
            <span className="flow-stage__number">{index + 1}</span>
            <span className="flow-stage__label">{item.label}</span>
            <span className="flow-stage__detail">{item.detail}</span>
            <span className="flow-stage__selection" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="study-loop__caption"><p key={active}><strong>{stage.label}</strong><span>{stage.detail}</span></p><Link href="/study/demo" className="text-link">Open example guide <ArrowRight /></Link></div>
    </section>
  );
}
