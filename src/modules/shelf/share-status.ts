import { useSyncExternalStore } from "react";
import * as shelf from "../../ipc/shelf";

const links = new Map<string, number>();
const listeners = new Set<() => void>();
let count = 0;
let expiryTimer: ReturnType<typeof setInterval> | null = null;

function publish() {
  const next = links.size;
  if (next === count) return;
  count = next;
  for (const listener of listeners) listener();
}

function prune() {
  const now = Date.now();
  for (const [token, until] of links) if (until <= now) links.delete(token);
  publish();
  if (links.size === 0 && expiryTimer !== null) {
    clearInterval(expiryTimer);
    expiryTimer = null;
  }
}

export function registerPhoneShare(token: string, until: number) {
  links.set(token, until);
  if (expiryTimer === null) expiryTimer = setInterval(prune, 1000);
  publish();
}

export function stopPhoneShare(token: string) {
  links.delete(token);
  publish();
  shelf.stopPhoneShare(token).catch(() => {});
}

export function usePhoneShareCount(): number {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, () => count, () => 0);
}
