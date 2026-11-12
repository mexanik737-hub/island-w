import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import * as shelf from "../../ipc/shelf";
import type { ShelfItem } from "../../ipc/shelf";
import { formatSize } from "./format";
import { CloseIcon, PhoneIcon, TrayIcon } from "./icons";
import { PhoneShare } from "./PhoneShare";
import { useShelf } from "./store";
import { localeOf, useLang, useT } from "../../i18n";
import "./shelf.css";

const ignore = () => {};

/** Moving this far with the button down starts dragging the item out. */
const DRAG_THRESHOLD = 5;

function Tile({ item, onShare }: { item: ShelfItem; onShare(): void }) {
  const messages = useT();
  const t = messages.shelf;
  const locale = localeOf(useLang());
  const icon = useRef<Promise<string> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const [failed, setFailed] = useState(false);

  // Prepared on hover so the drag starts without waiting. Without a
  // thumbnail, the file itself stands in (works for images).
  const prepareIcon = () => {
    icon.current ??= shelf.dragIcon(item.id).catch(() => item.path);
  };

  return (
    <motion.div
      layout
      className="shelf-tile"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      title={item.path}
      onPointerEnter={prepareIcon}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        const from = start.current;
        if (!from || dragged.current) return;
        if (Math.hypot(e.clientX - from.x, e.clientY - from.y) < DRAG_THRESHOLD) return;
        dragged.current = true;
        start.current = null;
        prepareIcon();
        // Copy, never move: dropping on a folder must not take the file away.
        icon
          .current!.then((iconPath) => startDrag({ item: [item.path], icon: iconPath, mode: "copy" }))
          .catch(ignore);
      }}
      onPointerUp={() => {
        if (start.current && !dragged.current) shelf.openItem(item.id).catch(ignore);
        start.current = null;
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        shelf.revealItem(item.id).catch(ignore);
      }}
    >
      <div className={`shelf-thumb shelf-thumb--${item.kind}`}>
        {!failed && <img src={item.thumbnail} alt="" draggable={false} onError={() => setFailed(true)} />}
        <button
          className="shelf-remove"
          aria-label={t.remove}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            shelf.removeItem(item.id).catch(ignore);
          }}
        >
          <CloseIcon size={10} />
        </button>
        {item.kind !== "folder" && (
          <button
            className="shelf-send"
            aria-label={t.send}
            title={t.send}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <PhoneIcon size={11} />
          </button>
        )}
      </div>
      <span className="shelf-name">{item.name}</span>
      {item.size !== null && <span className="shelf-size">{formatSize(item.size, locale, messages.sizeUnits)}</span>}
    </motion.div>
  );
}

/** The Shelf tab: the files kept here, or where to drop them. */
export function ShelfView({ dragging }: { dragging: boolean }) {
  const t = useT().shelf;
  const items = useShelf();
  const filePicker = useRef<HTMLInputElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  // The items being sent to a phone; those removed meanwhile drop out.
  const [sending, setSending] = useState<number[] | null>(null);
  const sent = sending && items.filter((i) => sending.includes(i.id));

  const files = items.filter((i) => i.kind !== "folder");

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!selected.length) return;
    if (selected.reduce((sum, file) => sum + file.size, 0) > 128 * 1024 * 1024) {
      setImportError(t.importTooLarge);
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const files = await Promise.all(selected.map(async (file) => ({ name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) })));
      await shelf.importFiles(files);
    } catch {
      setImportError(t.importFailed);
    } finally {
      setImporting(false);
    }
  };

  if (sent && sent.length > 0 && !dragging) {
    return (
      <div className="shelf">
        <PhoneShare items={sent} onBack={() => setSending(null)} />
      </div>
    );
  }

  return (
    <div className={`shelf ${dragging ? "shelf--target" : ""}`}>
      <div className="shelf-head">
        <span className="shelf-count">
          {t.count(items.length)}
        </span>
        <span className="shelf-head-actions">
          <button className="shelf-clear" disabled={importing} onClick={(e) => { e.stopPropagation(); filePicker.current?.click(); }}>
            {importing ? t.addingFiles : t.addFiles}
          </button>
          {files.length > 0 && (
            <button
              className="shelf-clear"
              onClick={(e) => {
                e.stopPropagation();
                setSending(files.map((i) => i.id));
              }}
            >
              <PhoneIcon size={11} />
              {files.length > 1 ? t.sendAll : t.send}
            </button>
          )}
          <button
            className="shelf-clear"
            onClick={(e) => {
              e.stopPropagation();
              shelf.clearShelf().catch(ignore);
            }}
          >
            {t.clear}
          </button>
        </span>
      </div>
      <input ref={filePicker} className="shelf-file-picker" type="file" multiple onChange={importFiles} aria-label={t.addFiles} />
      {importError && <p className="shelf-import-error" role="status">{importError}</p>}
      {items.length === 0 ? (
        <div className={`shelf-empty ${dragging ? "shelf-empty--target" : ""}`}>
          <TrayIcon size={22} />
          <span>{dragging ? t.dropHere : t.empty}</span>
        </div>
      ) : (
      <div
        ref={row}
        className="shelf-row"
        // A mouse wheel scrolls the row sideways.
        onWheel={(e) => {
          if (row.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) row.current.scrollLeft += e.deltaY;
        }}
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <Tile key={item.id} item={item} onShare={() => setSending([item.id])} />
          ))}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
