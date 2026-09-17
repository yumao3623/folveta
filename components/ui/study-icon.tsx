import type { SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  CircleCheck,
  CircleHelp,
  CircleUserRound,
  FileText,
  Files,
  History,
  House,
  LibraryBig,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Search,
  Target,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { cn } from "@/components/ui/styles";
import styles from "./study-icon.module.css";

export type StudyIconName =
  | "home"
  | "upload"
  | "guide"
  | "library"
  | "search"
  | "profile"
  | "history"
  | "material"
  | "source"
  | "check"
  | "success"
  | "error"
  | "locked"
  | "loading"
  | "target"
  | "help"
  | "edit"
  | "trash"
  | "archive"
  | "lightbulb";

const icons: Record<StudyIconName, LucideIcon> = {
  home: House,
  upload: Upload,
  guide: BookOpen,
  library: LibraryBig,
  search: Search,
  profile: CircleUserRound,
  history: History,
  material: FileText,
  source: Files,
  check: CircleCheck,
  success: CircleCheck,
  error: TriangleAlert,
  locked: LockKeyhole,
  loading: LoaderCircle,
  target: Target,
  help: CircleHelp,
  edit: Pencil,
  trash: Trash2,
  archive: Archive,
  lightbulb: Lightbulb,
};

type StudyIconProps = Omit<SVGProps<SVGSVGElement>, "name" | "title"> & {
  name: StudyIconName;
  size?: number | string;
  title?: string;
  animated?: boolean;
};

export function StudyIcon({
  name,
  className,
  size = 20,
  title,
  animated = false,
  ...props
}: StudyIconProps) {
  const Icon = icons[name];
  const labelled = Boolean(title);

  return (
    <Icon
      width={size}
      height={size}
      strokeWidth={2}
      absoluteStrokeWidth
      className={cn(styles.root, animated && styles.animated, className)}
      data-icon={name}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
    </Icon>
  );
}
