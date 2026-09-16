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
  material: "/illustrations/folveta-material-mascot.png",
  guide: "/illustrations/folveta-guide-book.png",
  "quick-check": "/illustrations/folveta-quick-check.png",
  source: "/illustrations/folveta-source-globe.png",
  quest: "/illustrations/folveta-quest-lightning.png",
  locked: "/illustrations/folveta-locked-guide.png",
  heart: "/illustrations/folveta-heart-recall.png",
};

const ASSET_ALT: Record<FolvetaAsset, string> = {
  material: "Colorful stack of study materials",
  guide: "Open study guide book",
  "quick-check": "Study check card with a confirmation badge",
  source: "Source reference globe",
  quest: "Lightning progress badge",
  locked: "Locked study guide",
  heart: "Heart recall badge",
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
        width={1254}
        height={1254}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className="asset-illustration__image"
      />
    </span>
  );
}
