import Image from "next/image";
import { cn } from "@/components/ui/styles";

export type FolvetaAsset =
  | "material"
  | "guide"
  | "quick-check"
  | "source"
  | "quest"
  | "locked"
  | "heart";

const ASSET_PATHS: Record<FolvetaAsset, string> = {
  material: "/illustrations/folveta-material-student.svg",
  guide: "/illustrations/folveta-guide-student.svg",
  "quick-check": "/illustrations/folveta-quick-check-student.svg",
  source: "/illustrations/folveta-source-student.svg",
  quest: "/illustrations/folveta-progress-student.svg",
  locked: "/illustrations/folveta-locked-student.svg",
  heart: "/illustrations/folveta-heart-student.svg",
};

const ASSET_ALT: Record<FolvetaAsset, string> = {
  material: "Student organizing course materials at a study desk",
  guide: "Student holding a study guide beside organized books",
  "quick-check": "Student reviewing a checklist and calendar at a laptop",
  source: "Student checking a source page beside a laptop and notes",
  quest: "Student tracking a study milestone beside a calendar",
  locked: "Student pausing beside a private study folder",
  heart: "Student returning to review cards and notes",
};

/**
 * Shared entry point for Folveta's filled illustration system. Business
 * actions remain real HTML controls; this component only supplies visual
 * assets and a stable semantic label for motion wrappers.
 */
export function AssetIllustration({
  asset,
  className,
  priority = false,
  decorative = false,
  sizes = "(max-width: 640px) 34vw, 180px",
}: {
  asset: FolvetaAsset;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  sizes?: string;
}) {
  return (
    <span className={cn("asset-illustration", `asset-illustration--${asset}`, className)} data-asset={asset}>
      <Image
        src={ASSET_PATHS[asset]}
        alt={decorative ? "" : ASSET_ALT[asset]}
        width={800}
        height={540}
        sizes={sizes}
        preload={priority}
        loading={priority ? undefined : "lazy"}
        className="asset-illustration__image"
      />
    </span>
  );
}
