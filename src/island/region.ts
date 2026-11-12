/**
 * Keeps the island window's region (where it draws and takes clicks) on the
 * shell. The region follows the shell's *target* shape, not its animated
 * size, so it is already right when the shell starts growing. When the shell
 * shrinks, the previous rectangles are held a little longer so the animation
 * leaving them is not clipped. (Idea from Bloom's windowRegion.ts; this is an
 * independent implementation.)
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { setIslandRegion, type RegionRect } from "../ipc/island";

export interface HeldRegion {
  rects: RegionRect[];
  until: number;
}

export interface RegionState {
  current: RegionRect[];
  held: HeldRegion[];
}

export const EMPTY_REGION: RegionState = { current: [], held: [] };

export function regionKey(rects: readonly RegionRect[]): string {
  return rects.map((r) => `${r.x},${r.y},${r.width},${r.height}`).join(";");
}

/**
 * Folds the rectangles wanted now into the region. Returns the rectangles to
 * apply and when the next held region expires (null if none is held).
 */
export function nextRegion(
  state: RegionState,
  wanted: RegionRect[],
  now: number,
  holdMs: number,
): { state: RegionState; rects: RegionRect[]; nextExpiry: number | null } {
  let held = state.held;
  if (state.current.length > 0 && regionKey(wanted) !== regionKey(state.current)) {
    held = [...held, { rects: state.current, until: now + holdMs }];
  }
  held = held.filter((h) => h.until > now);
  const rects = [...wanted, ...held.flatMap((h) => h.rects)];
  const nextExpiry = held.length > 0 ? Math.min(...held.map((h) => h.until)) : null;
  return { state: { current: wanted, held }, rects, nextExpiry };
}

/** Calls `callback` whenever the display scale (device pixel ratio) changes. */
function onScaleChange(callback: () => void): () => void {
  let query: MediaQueryList | null = null;
  const changed = () => {
    arm();
    callback();
  };
  // A resolution query matches only the ratio it was made for, so it is
  // re-armed for the new ratio on every change.
  const arm = () => {
    query?.removeEventListener("change", changed);
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener("change", changed);
  };
  arm();
  return () => query?.removeEventListener("change", changed);
}

/**
 * Applies `wanted` as the window region, holding shrunk-away rectangles for
 * `holdMs`. Re-sent when the display scale changes, since the backend
 * converts to physical pixels.
 */
export function useIslandRegion(wanted: RegionRect[], holdMs: number): boolean {
  const state = useRef<RegionState>(EMPTY_REGION);
  const latest = useRef(wanted);
  const sent = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  latest.current = wanted;
  const key = regionKey(wanted);
  const latestKey = useRef(key);
  latestKey.current = key;
  const [applied, setApplied] = useState<string | null>(null);
  const pending = useRef(Promise.resolve());
  const sequence = useRef(0);

  const send = (rects: RegionRect[], forKey: string) => {
    const version = ++sequence.current;
    setApplied(null);
    // Keep native requests ordered: a slow previous request must never restore
    // an old clipping region after the new one has been acknowledged.
    pending.current = pending.current.then(() => setIslandRegion(rects)).then(() => {
      if (version === sequence.current && latestKey.current === forKey) setApplied(forKey);
    }).catch((e: unknown) => {
      sent.current = null;
      console.warn("set_island_region failed", e);
    });
  };

  useLayoutEffect(() => {
    const update = (force = false) => {
      const next = nextRegion(state.current, latest.current, performance.now(), holdMs);
      state.current = next.state;
      const nextKey = regionKey(next.rects);
      if (force || nextKey !== sent.current) {
        sent.current = nextKey;
        send(next.rects, key);
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current =
        next.nextExpiry === null ? null : setTimeout(() => update(), next.nextExpiry - performance.now() + 5);
    };
    update();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, holdMs]);

  useEffect(
    () =>
      onScaleChange(() => {
        sent.current = null;
        send([...state.current.current, ...state.current.held.flatMap((h) => h.rects)], latestKey.current);
      }),
    [],
  );
  return applied === key;
}
