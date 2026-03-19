"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trickleRef = useRef<ReturnType<typeof setInterval>>(null);
  const progressRef = useRef(0);

  const set = (value: number) => {
    progressRef.current = value;
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${value / 100})`;
      barRef.current.style.opacity = value > 0 && value < 100 ? "1" : "0";
    }
  };

  const start = useCallback(() => {
    if (trickleRef.current) clearInterval(trickleRef.current);
    if (containerRef.current) containerRef.current.style.display = "";
    set(15);
    trickleRef.current = setInterval(() => {
      const p = progressRef.current;
      if (p < 30) set(p + 3);
      else if (p < 60) set(p + 2);
      else if (p < 80) set(p + 0.5);
      // stall at 80 — waits for complete()
    }, 80);
  }, []);

  const complete = useCallback(() => {
    if (trickleRef.current) clearInterval(trickleRef.current);
    trickleRef.current = null;
    set(100);
    setTimeout(() => {
      set(0);
      if (containerRef.current) containerRef.current.style.display = "none";
    }, 300);
  }, []);

  // Complete on route change
  useEffect(() => {
    complete();
  }, [pathname, searchParams, complete]);

  // Start on internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.getAttribute("href")?.startsWith("#") ||
        anchor.getAttribute("href")?.startsWith("http")
      ) return;

      const href = anchor.getAttribute("href");
      if (href && href !== pathname) start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, start]);

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-0 z-[100] h-[3px]" style={{ display: "none" }}>
      <div
        ref={barRef}
        className="h-full origin-left bg-foreground"
        style={{
          transform: "scaleX(0)",
          opacity: 0,
          transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease",
        }}
      />
    </div>
  );
}
