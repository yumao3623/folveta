"use client";

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { dialogExitDuration, dialogFocusTargetIndex } from "@/components/ui/dialog-behavior";
import { cn } from "@/components/ui/styles";
import styles from "./dialog-frame.module.css";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

let lockCount = 0;
let restoreBody: (() => void) | undefined;

function lockPageScroll() {
  if (lockCount === 0) {
    const body = document.body;
    const root = document.documentElement;
    const overflow = body.style.overflow;
    const paddingRight = body.style.paddingRight;
    const scrollbarGutter = root.style.scrollbarGutter;
    const gap = window.innerWidth - root.clientWidth;
    if (gap > 0) {
      if (CSS.supports("scrollbar-gutter: stable")) root.style.scrollbarGutter = "stable";
      else body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gap}px`;
    }
    body.style.overflow = "hidden";
    restoreBody = () => {
      body.style.overflow = overflow;
      body.style.paddingRight = paddingRight;
      root.style.scrollbarGutter = scrollbarGutter;
    };
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) { restoreBody?.(); restoreBody = undefined; }
  };
}

/** Native top-layer dialog plus a shared, interruptible motion/focus contract. */
export function DialogFrame({
  open,
  onClose,
  pending = false,
  initialFocusRef,
  labelledBy,
  describedBy,
  role = "dialog",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  pending?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  labelledBy: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const releaseScrollRef = useRef<(() => void) | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const finishClose = useCallback((notify: boolean) => {
    const dialog = dialogRef.current;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    dialog?.close();
    releaseScrollRef.current?.();
    releaseScrollRef.current = null;
    if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus({ preventScroll: true });
    if (notify) onCloseRef.current();
  }, []);

  const beginClose = useCallback((notify: boolean) => {
    const dialog = dialogRef.current;
    if (!dialog?.open || closeTimerRef.current) return;
    dialog.dataset.state = "closing";
    closeTimerRef.current = setTimeout(() => finishClose(notify), dialogExitDuration(window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  }, [finishClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) { beginClose(false); return; }
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    dialog.dataset.state = "open";
    if (dialog.open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    releaseScrollRef.current = lockPageScroll();
    dialog.showModal();
    const frame = requestAnimationFrame(() => (initialFocusRef?.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, beginClose, initialFocusRef]);

  useEffect(() => () => finishClose(false), [finishClose]);

  return (
    <dialog
      ref={dialogRef}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      className={cn(styles.frame, className)}
      onCancel={(event) => { event.preventDefault(); if (!pending) beginClose(true); }}
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || pending) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) beginClose(true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
        const targetIndex = dialogFocusTargetIndex(controls.length, controls.indexOf(document.activeElement as HTMLElement), event.shiftKey);
        if (controls.length === 0) { event.preventDefault(); event.currentTarget.focus(); }
        else if (targetIndex !== null) { event.preventDefault(); controls[targetIndex].focus(); }
      }}
    >
      {children}
    </dialog>
  );
}
