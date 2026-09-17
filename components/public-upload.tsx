"use client";

import { BILLING_PLANS } from "@/lib/billing/config";
import { MVP_LIMITS, formatMegabytes } from "@/lib/config";
import { UploadPanel } from "@/components/upload-panel";
import { usePublicViewer } from "@/components/public-viewer";

export function PublicUploadPanel() {
  const { viewer, status } = usePublicViewer();
  return <>
    <UploadPanel maxFiles={(viewer?.limits ?? BILLING_PLANS.free).maxFiles} unavailable={status !== "ready"} />
    {status === "error" ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
      We could not check your plan. <button className="underline" onClick={() => window.location.reload()}>Refresh and try again</button>.
    </p> : null}
  </>;
}

export function PublicUploadLimits() {
  const { viewer, status } = usePublicViewer();
  const limits = viewer?.limits ?? BILLING_PLANS.free;
  return <dl aria-busy={status === "loading"}>
    <div><dt>{limits.label} files / Guide</dt><dd>Up to {limits.maxFiles}</dd></div>
    <div><dt>Per file</dt><dd>{formatMegabytes(MVP_LIMITS.maxFileBytes)}</dd></div>
    <div><dt>Combined</dt><dd>{limits.maxUnits} units</dd></div>
  </dl>;
}
