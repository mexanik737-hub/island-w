import { useEffect, useState } from "react";
import * as shelf from "../../ipc/shelf";
import type { PhoneLink, ShelfItem } from "../../ipc/shelf";
import { countdown } from "./format";
import { ShareIcon } from "./icons";
import { useT } from "../../i18n";

type State = { link: PhoneLink; until: number } | { error: string } | null;

/**
 * Sending files to a phone: a QR code its camera opens (same network, link
 * valid ten minutes), or Windows' Share panel.
 */
export function PhoneShare({ items, onBack }: { items: ShelfItem[]; onBack(): void }) {
  const t = useT().phone;
  const [state, setState] = useState<State>(null);
  const [now, setNow] = useState(() => Date.now());
  const [shareError, setShareError] = useState<string | null>(null);
  // Bumped by "Nouveau code".
  const [attempt, setAttempt] = useState(0);
  const ids = items.map((i) => i.id);
  const key = ids.join(",");

  // The Rust server owns links independently from this view. The component
  // can disappear while the user switches tabs or folds the island.
  useEffect(() => {
    let alive = true;
    setState(null);
    shelf
      .shareToPhone(key.split(",").map(Number))
      .then((link) => {
        if (alive) setState({ link, until: Date.now() + link.expiresInSecs * 1000 });
      })
      .catch((e) => alive && setState({ error: String(e) }));
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = state && "link" in state ? Math.max(0, Math.round((state.until - now) / 1000)) : 0;
  const expired = state !== null && "link" in state && left === 0;
  const what = items.length === 1 ? items[0].name : t.files(items.length);

  return (
    <div className="phone-share" onPointerDown={(e) => e.stopPropagation()}>
      <div className="phone-qr">
        {state && "link" in state && !expired ? (
          <svg viewBox={`-2 -2 ${state.link.qrSize + 4} ${state.link.qrSize + 4}`} shapeRendering="crispEdges" role="img" aria-label={t.qrLabel}>
            <rect x="-2" y="-2" width={state.link.qrSize + 4} height={state.link.qrSize + 4} fill="#fff" />
            <path d={state.link.qrPath} fill="#000" />
          </svg>
        ) : (
          <span className="phone-qr-empty">{expired ? t.expired : state && "error" in state ? "!" : ""}</span>
        )}
      </div>
      <div className="phone-text">
        <span className="phone-title">{expired ? t.expiredTitle : t.scan}</span>
        <span className="phone-name">{what}</span>
        <span className="phone-sub">
          {state === null
            ? t.preparing
            : "error" in state
              ? state.error
              : expired
                ? t.expiredHint
                : (shareError ?? t.sameWifi(countdown(left)))}
        </span>
        <div className="phone-actions">
          {expired || (state && "error" in state) ? (
            <button className="phone-btn phone-btn--main" onClick={() => {
              if (state && "link" in state) shelf.stopPhoneShare(state.link.token).catch(() => {});
              setAttempt((n) => n + 1);
            }}>
              {t.newCode}
            </button>
          ) : (
            <button
              className="phone-btn"
              onClick={() => {
                setShareError(null);
                shelf.shareWithWindows(ids).catch((e) => setShareError(String(e)));
              }}
            >
              <ShareIcon size={13} />
              {t.shareWindows}
            </button>
          )}
          <button className="phone-btn" onClick={() => {
            if (state && "link" in state) shelf.stopPhoneShare(state.link.token).catch(() => {});
            onBack();
          }}>
            {t.back}
          </button>
        </div>
      </div>
    </div>
  );
}
