"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicViewer } from "@/lib/public-viewer";

type ViewerState = {
  viewer: PublicViewer | null;
  status: "loading" | "ready" | "error";
};

const ViewerContext = createContext<ViewerState>({ viewer: null, status: "loading" });

/** Only the public shell is prerendered. Identity never enters its HTML or cache. */
export function PublicViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState>({ viewer: null, status: "loading" });

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 12000);
      try {
        const response = await fetch("/api/viewer", {
          credentials: "same-origin", cache: "no-store", signal: request.signal,
        });
        if (!response.ok) throw new Error("Viewer unavailable");
        const viewer: PublicViewer = await response.json();
        if (active && controller === request) setState({ viewer, status: "ready" });
      } catch {
        if (active && controller === request) setState({ viewer: null, status: "error" });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    function resetAndRefresh() {
      setState({ viewer: null, status: "loading" });
      void refresh();
    }
    function onVisible() {
      if (document.visibilityState === "visible") resetAndRefresh();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) resetAndRefresh();
    }
    void refresh();
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <ViewerContext.Provider value={state}>{children}</ViewerContext.Provider>;
}

export function usePublicViewer() {
  return useContext(ViewerContext);
}
