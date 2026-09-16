import type { SVGProps } from "react";
import { cn } from "@/components/ui/styles";
import styles from "./cartoon-icon.module.css";

export type CartoonIconName =
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

type CartoonIconProps = Omit<SVGProps<SVGSVGElement>, "name" | "title"> & {
  name: CartoonIconName;
  size?: number | string;
  title?: string;
  animated?: boolean;
};

const palette = {
  ink: "#20332b",
  green: "#0a9e4a",
  greenDark: "#08783a",
  mint: "#bcefd0",
  blue: "#3ab8f2",
  blueSoft: "#bfeafa",
  coral: "#ff6b6b",
  coralSoft: "#ffc5bf",
  yellow: "#ffcf3e",
  gray: "#b8c9c1",
  graySoft: "#e2ece7",
  white: "#fffdf8",
};

export function CartoonIcon({
  name,
  className,
  size = 24,
  title,
  animated = false,
  ...props
}: CartoonIconProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn(styles.root, animated && styles.animated, className)}
      data-icon={name}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <IconArtwork name={name} />
    </svg>
  );
}

function IconArtwork({ name }: { name: CartoonIconName }) {
  switch (name) {
    case "home":
      return <Home />;
    case "upload":
      return <Upload />;
    case "guide":
      return <Guide />;
    case "library":
      return <Library />;
    case "search":
      return <Search />;
    case "profile":
      return <Profile />;
    case "history":
      return <History />;
    case "material":
      return <Material />;
    case "source":
      return <Source />;
    case "check":
    case "success":
      return <Check success={name === "success"} />;
    case "error":
      return <ErrorIcon />;
    case "locked":
      return <Locked />;
    case "loading":
      return <Loading />;
    case "target":
      return <Target />;
    case "help":
      return <Help />;
    case "lightbulb":
      return <Lightbulb />;
    case "edit":
      return <Edit />;
    case "trash":
      return <Trash />;
    case "archive":
      return <Archive />;
  }
}

function Edit() {
  return <g stroke={palette.ink} strokeWidth="3.5" strokeLinejoin="round">
    <path d="M12 40 39 13 51 25 24 52 9 55Z" fill={palette.yellow} />
    <path d="m39 13 5-5q4-4 8 0l4 4q4 4 0 8l-5 5Z" fill={palette.coral} />
    <path d="m35 17 12 12" stroke={palette.blue} strokeWidth="6" />
    <path d="m12 40 12 12-15 3Z" fill={palette.white} />
    <path d="m10 49 5 5-6 1Z" fill={palette.ink} strokeWidth="2" />
    <path d="m21 40 16-16" stroke={palette.white} strokeWidth="3" strokeLinecap="round" />
  </g>;
}

function Trash() {
  return <g stroke={palette.ink} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="m15 22 4 31q1 5 6 5h15q5 0 6-5l4-31" fill={palette.coral} />
    <path d="M23 15v-3q0-5 5-5h9q5 0 5 5v3" fill={palette.blueSoft} />
    <path d="M11 15h43v9H11Z" fill={palette.yellow} />
    <path d="m26 33 1 14m11-14-1 14" stroke={palette.white} strokeWidth="5" />
  </g>;
}

function Archive() {
  return <g stroke={palette.ink} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M11 23h43v29q0 5-5 5H16q-5 0-5-5Z" fill={palette.blue} />
    <path d="M7 12h51v13H7Z" fill={palette.yellow} />
    <rect x="23" y="32" width="18" height="10" rx="3" fill={palette.white} />
    <path d="M18 51h28" stroke={palette.blueSoft} strokeWidth="4" />
  </g>;
}

function Home() {
  return <g className={styles.parts}>
    <path d="M9 30.5 30.7 12a2 2 0 0 1 2.6 0L55 30.5v22a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4v-22Z" fill={palette.blueSoft} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <path d="m7 30 24.9-20L57 30l-4 4-21.1-17L11 34l-4-4Z" fill={palette.coral} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <path d="M25 56V38a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v18" fill={palette.yellow} stroke={palette.ink} strokeWidth="4" />
    <circle cx="32" cy="42" r="2.8" fill={palette.ink} />
  </g>;
}

function Upload() {
  return <g className={styles.parts}>
    <path d="M13 18h38a5 5 0 0 1 5 5v27a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Z" fill={palette.blueSoft} stroke={palette.ink} strokeWidth="4" />
    <g className={styles.uploadArrow}><path d="M32 43V11m0 0L21 22m11-11 11 11" fill="none" stroke={palette.green} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
    <path d="M20 51h24" stroke={palette.coral} strokeWidth="4" strokeLinecap="round" />
  </g>;
}

function Guide() {
  return <g className={styles.parts}>
    <path d="M8 14c8-4 16-3 24 3v37c-8-5-16-5-24-1V14Z" fill={palette.blueSoft} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <g className={styles.guideHinge}><path d="M56 14c-8-4-16-3-24 3v37c8-5 16-5 24-1V14Z" fill={palette.mint} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" /><path d="M48 25H37m11 8H37" stroke={palette.greenDark} strokeWidth="3.5" strokeLinecap="round" /></g>
    <path d="M32 17v37" stroke={palette.ink} strokeWidth="4" />
    <path d="M15 25h11m-11 8h11" stroke={palette.greenDark} strokeWidth="3.5" strokeLinecap="round" />
    <path d="m47 8 2.2 4.7L54 15l-4.8 2.2L47 22l-2.2-4.8L40 15l4.8-2.3L47 8Z" fill={palette.yellow} stroke={palette.ink} strokeWidth="2.5" strokeLinejoin="round" />
  </g>;
}

function Library() {
  return <g className={styles.parts}>
    <path d="M12 15h36a5 5 0 0 1 5 5v35H17a5 5 0 0 1-5-5V15Z" fill={palette.mint} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <path d="M12 21h35a6 6 0 0 1 6 6H18a6 6 0 0 1-6-6Z" fill={palette.coral} stroke={palette.ink} strokeWidth="4" />
    <path d="M24 16v9m16-9v9" stroke={palette.ink} strokeWidth="4" strokeLinecap="round" />
    <path d="M26 34h17M26 42h12" stroke={palette.greenDark} strokeWidth="3.5" strokeLinecap="round" />
  </g>;
}

function Search() {
  return <g className={styles.parts}>
    <circle cx="28" cy="28" r="16" fill={palette.blueSoft} stroke={palette.ink} strokeWidth="5" />
    <path d="m40 40 14 14" stroke={palette.coral} strokeWidth="7" strokeLinecap="round" />
    <circle cx="25" cy="24" r="4" fill={palette.white} opacity=".9" />
  </g>;
}

function Profile() {
  return <g className={styles.parts}>
    <circle cx="32" cy="20" r="11" fill={palette.yellow} stroke={palette.ink} strokeWidth="4" />
    <path d="M10 56c1-12 9-19 22-19s21 7 22 19" fill={palette.coralSoft} stroke={palette.ink} strokeWidth="4" strokeLinecap="round" />
    <circle cx="28" cy="18" r="2" fill={palette.ink} /><circle cx="36" cy="18" r="2" fill={palette.ink} />
  </g>;
}

function History() {
  return <g className={styles.parts}>
    <path d="M11 27a22 22 0 1 1 4 17" fill="none" stroke={palette.blue} strokeWidth="6" strokeLinecap="round" />
    <path d="m11 18 1 12 11-5" fill={palette.blue} stroke={palette.ink} strokeWidth="3" strokeLinejoin="round" />
    <circle cx="32" cy="32" r="17" fill={palette.mint} stroke={palette.ink} strokeWidth="4" />
    <path d="M32 23v10l7 5" fill="none" stroke={palette.greenDark} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </g>;
}

function Material() {
  return <g className={styles.parts}>
    <path d="M13 14h31l8 8v29H13a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" fill={palette.yellow} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <g className={styles.materialTop}><path d="M44 14v11h8" fill={palette.coral} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" /></g>
    <path d="M19 34h23m-23 8h18" stroke={palette.greenDark} strokeWidth="4" strokeLinecap="round" />
    <path d="m47 39 4 4-4 4" fill="none" stroke={palette.blue} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </g>;
}

function Source() {
  return <g className={styles.parts}>
    <circle cx="29" cy="31" r="18" fill={palette.green} stroke={palette.ink} strokeWidth="4" />
    <path d="M13 29c9 5 21 5 32 0M18 17c5 8 5 20 0 28M40 17c-5 8-5 20 0 28" fill="none" stroke={palette.blue} strokeWidth="3.5" strokeLinecap="round" />
    <g className={styles.sourceMarker}><circle cx="51" cy="15" r="8" fill={palette.coral} stroke={palette.ink} strokeWidth="3" /><path d="M49 15h4m-2-2v4" stroke={palette.white} strokeWidth="2.5" strokeLinecap="round" /></g>
  </g>;
}

function Check({ success }: { success: boolean }) {
  return <g className={styles.parts}>
    <circle cx="32" cy="32" r="22" fill={success ? palette.green : palette.blue} stroke={palette.ink} strokeWidth="4" />
    <g className={styles.checkMark}><path d="m20 32 8 8 17-18" fill="none" stroke={palette.white} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></g>
    <path d="m49 8 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill={palette.yellow} stroke={palette.ink} strokeWidth="2" strokeLinejoin="round" />
  </g>;
}

function ErrorIcon() {
  return <g className={styles.parts}>
    <path d="M32 7 57 52H7L32 7Z" fill={palette.coral} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <g className={styles.errorMark}><path d="M32 22v14" stroke={palette.white} strokeWidth="6" strokeLinecap="round" /><circle cx="32" cy="44" r="3.5" fill={palette.white} /></g>
  </g>;
}

function Locked() {
  return <g className={styles.parts}>
    <path d="M16 27V19a16 16 0 0 1 32 0v8" fill={palette.blueSoft} stroke={palette.ink} strokeWidth="5" strokeLinecap="round" />
    <rect x="10" y="25" width="44" height="31" rx="7" fill={palette.green} stroke={palette.ink} strokeWidth="4" />
    <circle cx="32" cy="39" r="5" fill={palette.coral} /><path d="M32 43v6" stroke={palette.coral} strokeWidth="4" strokeLinecap="round" />
    <path d="m48 8 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill={palette.yellow} stroke={palette.ink} strokeWidth="2" />
  </g>;
}

function Loading() {
  return <g className={styles.parts}>
    <g className={styles.loadingRing}><path d="M32 8a24 24 0 1 1-17 7" fill="none" stroke={palette.blue} strokeWidth="7" strokeLinecap="round" /></g>
    <path d="M14 9v13h13" fill="none" stroke={palette.yellow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="32" r="6" fill={palette.coral} stroke={palette.ink} strokeWidth="3" />
  </g>;
}

function Target() {
  return <g className={styles.parts}>
    <circle cx="32" cy="32" r="23" fill={palette.coralSoft} stroke={palette.ink} strokeWidth="4" />
    <circle cx="32" cy="32" r="14" fill={palette.white} stroke={palette.coral} strokeWidth="5" />
    <circle cx="32" cy="32" r="6" fill={palette.green} stroke={palette.ink} strokeWidth="3" />
    <path d="M45 13 56 8l-5 11" fill={palette.yellow} stroke={palette.ink} strokeWidth="3" strokeLinejoin="round" />
  </g>;
}

function Help() {
  return <g className={styles.parts}>
    <circle cx="32" cy="32" r="23" fill={palette.yellow} stroke={palette.ink} strokeWidth="4" />
    <path d="M24 25a9 9 0 1 1 14 7c-4 2-6 4-6 8" fill="none" stroke={palette.ink} strokeWidth="5" strokeLinecap="round" />
    <circle cx="32" cy="49" r="3" fill={palette.ink} />
  </g>;
}

function Lightbulb() {
  return <g className={styles.parts}>
    <path d="M20 29a13 13 0 1 1 24 0c-2 4-5 6-6 11H26c-1-5-4-7-6-11Z" fill={palette.yellow} stroke={palette.ink} strokeWidth="4" strokeLinejoin="round" />
    <path d="M27 47h10m-8 7h6" stroke={palette.coral} strokeWidth="4" strokeLinecap="round" />
    <path d="M12 18 7 13m45 5 5-5M32 8V3" stroke={palette.blue} strokeWidth="4" strokeLinecap="round" />
    <path d="M30 31h5" stroke={palette.white} strokeWidth="3" strokeLinecap="round" />
  </g>;
}
