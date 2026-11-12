import { useT } from "../../i18n";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { recognizeImage } from "../../ipc/ocr";
import * as shelf from "../../ipc/shelf";
import { recording, useRecordingState } from "./recording";
import "./capture-tools.css";

type Tool = "pen" | "rectangle" | "arrow" | "blur" | "text" | "crop" | "pick";
type Point = { x: number; y: number };
type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
};
type DrawMode = Exclude<Tool, "pick" | "text">;
type DrawState = { mode: DrawMode; start: Point; last: Point; before: ImageData };

function pointAt(event: PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = event.currentTarget.width / Math.max(1, rect.width);
  const scaleY = event.currentTarget.height / Math.max(1, rect.height);
  return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function drawShape(ctx: CanvasRenderingContext2D, mode: DrawMode, from: Point, to: Point, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, ctx.canvas.width / 420);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (mode === "rectangle") {
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  } else if (mode === "crop") {
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  } else if (mode === "blur") {
    ctx.fillStyle = "rgba(8,8,10,.48)";
    ctx.fillRect(from.x, from.y, to.x - from.x, to.y - from.y);
    ctx.strokeStyle = color;
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  } else {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const head = Math.max(14, ctx.canvas.width / 35);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function CaptureToolsView() {
  const t = useT().capture;
  const recordingState = useRecordingState();
  const stream = recordingState.stream;
  const recordingActive = recordingState.phase === "active" || recordingState.phase === "starting" || recordingState.phase === "stopping";
  const [captured, setCaptured] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ff6259");
  const [picked, setPicked] = useState("#000000");
  const [colorHistory, setColorHistory] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("island-w:color-history") ?? "[]") as string[]; } catch { return []; } });
  const [qr, setQr] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null);
  const [magnifier, setMagnifier] = useState<{ x: number; y: number; left: number; top: number } | null>(null);
  const drawRef = useRef<DrawState | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setMessage(t.previewError));
  }, [stream]);

  const previousPhase = useRef(recordingState.phase);
  useEffect(() => {
    if (recordingState.phase === "error") setMessage(t.recordError);
    else if (recordingState.phase === "active") setMessage(t.recording);
    else if (previousPhase.current === "stopping" && recordingState.phase === "idle") setMessage(t.recordSaved);
    previousPhase.current = recordingState.phase;
  }, [recordingState.phase, t.recordError, t.recording, t.recordSaved]);

  const chooseSource = async () => {
    setMessage("");
    setQr("");
    try {
      const next = await recording.chooseScreen();
      if (!next) {
        if (!recording.getSnapshot().error) setMessage(t.cancelled);
        else setMessage(t.error);
        return;
      }
      setCaptured(false);
    } catch (error) {
      setMessage(t.error);
    }
  };

  const stopSource = () => {
    recording.stopScreen();
    setMessage(t.stopped);
  };

  const takeScreenshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setMessage(t.chooseFirst);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(true);
    setMessage(t.ready);
    setQr("");
  };

  const exportCanvas = (kind: "copy" | "save") => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setMessage(t.exportError);
        return;
      }
      if (kind === "save") {
        download(blob, `Island-W-${new Date().toISOString().replace(/[:.]/g, "-")}.png`);
        setMessage(t.saved);
        return;
      }
      try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error(t.clipboardError);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setMessage(t.copied);
      } catch (error) {
        setMessage(t.error);
      }
    }, "image/png");
  };

  const addScreenshotToShelf = () => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setMessage(t.exportError);
        return;
      }
      try {
        const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
        await shelf.importFiles([{ name: `Island-W-${Date.now()}.png`, bytes }]);
        setMessage(t.addedToShelf);
      } catch {
        setMessage(t.exportError);
      }
    }, "image/png");
  };

  const extractText = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    setOcrBusy(true);
    setOcrText("");
    setMessage(t.ocrBusy);
    try {
      const text = await recognizeImage(canvas.toDataURL("image/png"));
      setOcrText(text);
      setMessage(text.trim() ? t.ocrDone : t.ocrEmpty);
    } catch (error) {
      setMessage(t.error);
    } finally {
      setOcrBusy(false);
    }
  };

  const copyOcrText = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setMessage(t.ocrCopied);
    } catch (error) {
      setMessage(t.error);
    }
  };

  const scanQr = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setMessage(t.qrUnsupported);
      return;
    }
    try {
      const detector = new Detector({ formats: ["qr_code"] });
      const results = await detector.detect(canvas);
      const value = results[0]?.rawValue ?? "";
      setQr(value);
      setMessage(value ? t.qrFound : t.qrEmpty);
    } catch (error) {
      setMessage(t.error);
    }
  };

  const toggleRecording = () => recordingActive ? recording.stop() : recording.start();

  const sampleColor = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const point = pointAt(event);
    const pixel = context.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;
    const hex = "#" + [...pixel.slice(0, 3)].map((channel) => channel.toString(16).padStart(2, "0")).join("");
    setPicked(hex);
    setColorHistory((previous) => { const next = [hex, ...previous.filter((item) => item !== hex)].slice(0, 10); try { localStorage.setItem("island-w:color-history", JSON.stringify(next)); } catch { /* optional */ } return next; });
    setMessage(hex.toUpperCase());
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!captured) return;
    if (tool === "pick") {
      sampleColor(event);
      return;
    }
    if (tool === "text") {
      const value = window.prompt(t.addText);
      if (!value) return;
      const point = pointAt(event);
      const context = event.currentTarget.getContext("2d");
      if (!context) return;
      context.save();
      context.fillStyle = color;
      context.font = "600 " + Math.max(18, event.currentTarget.width / 42) + "px Segoe UI";
      context.shadowColor = "rgba(0,0,0,.85)";
      context.shadowBlur = 5;
      context.fillText(value.slice(0, 200), point.x, point.y);
      context.restore();
      return;
    }
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const start = pointAt(event);
    const before = context.getImageData(0, 0, canvas.width, canvas.height);
    drawRef.current = { mode: tool, start, last: start, before };
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (tool === "pick") {
      const point = pointAt(event);
      const rect = event.currentTarget.getBoundingClientRect();
      setMagnifier({
        x: point.x,
        y: point.y,
        left: Math.min(Math.max(0, event.clientX - rect.left + 14), Math.max(0, rect.width - 108)),
        top: Math.max(0, event.clientY - rect.top - 118),
      });
      return;
    }
    setMagnifier(null);
    const draw = drawRef.current;
    if (!draw) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const next = pointAt(event);
    if (draw.mode === "pen") {
      context.strokeStyle = color;
      context.lineWidth = Math.max(4, event.currentTarget.width / 500);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      context.moveTo(draw.last.x, draw.last.y);
      context.lineTo(next.x, next.y);
      context.stroke();
      draw.last = next;
      return;
    }
    context.putImageData(draw.before, 0, 0);
    drawShape(context, draw.mode, draw.start, next, color);
    draw.last = next;
  };

  useEffect(() => {
    const source = canvasRef.current;
    const lens = magnifierRef.current;
    if (!source || !lens || !magnifier) return;
    const context = lens.getContext("2d");
    if (!context) return;
    const size = 22;
    const sx = Math.max(0, Math.min(source.width - size, magnifier.x - size / 2));
    const sy = Math.max(0, Math.min(source.height - size, magnifier.y - size / 2));
    context.clearRect(0, 0, lens.width, lens.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(source, sx, sy, size, size, 0, 0, lens.width, lens.height);
    context.strokeStyle = "rgba(255,255,255,.9)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(lens.width / 2, 0);
    context.lineTo(lens.width / 2, lens.height);
    context.moveTo(0, lens.height / 2);
    context.lineTo(lens.width, lens.height / 2);
    context.stroke();
  }, [magnifier]);

  const onPointerUp = () => {
    const draw = drawRef.current;
    if (!draw) return;
    drawRef.current = null;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const left = Math.max(0, Math.floor(Math.min(draw.start.x, draw.last.x)));
    const top = Math.max(0, Math.floor(Math.min(draw.start.y, draw.last.y)));
    const right = Math.min(canvas.width, Math.ceil(Math.max(draw.start.x, draw.last.x)));
    const bottom = Math.min(canvas.height, Math.ceil(Math.max(draw.start.y, draw.last.y)));
    const width = right - left;
    const height = bottom - top;
    if (width < 6 || height < 6) {
      context.putImageData(draw.before, 0, 0);
      return;
    }
    if (draw.mode === "crop") {
      context.putImageData(draw.before, 0, 0);
      const selected = context.getImageData(left, top, width, height);
      canvas.width = width;
      canvas.height = height;
      const cropped = canvas.getContext("2d");
      if (cropped) cropped.putImageData(selected, 0, 0);
      setMessage(t.cropped);
      return;
    }
    if (draw.mode === "blur") {
      context.putImageData(draw.before, 0, 0);
      const patch = document.createElement("canvas");
      patch.width = width;
      patch.height = height;
      const patchContext = patch.getContext("2d");
      if (patchContext) {
        patchContext.putImageData(context.getImageData(left, top, width, height), 0, 0);
        context.save();
        context.filter = "blur(" + Math.max(5, Math.min(width, height) / 8) + "px)";
        context.drawImage(patch, left, top, width, height);
        context.restore();
      }
      setMessage(t.blurred);
    }
  };

  return (
    <section className="capture-tools">
      <header className="capture-tools-head">
        <div><strong>{t.title}</strong><span>{t.hint}</span></div>
        <div className="capture-tools-actions">
          {!stream ? <button type="button" onClick={chooseSource} disabled={recordingState.selecting}>{t.choose}</button> : <button type="button" onClick={stopSource}>{t.stop}</button>}
          <button type="button" onClick={takeScreenshot} disabled={!stream}>{t.screenshot}</button>
          <button type="button" className={recordingState.phase === "active" ? "is-recording" : ""} onClick={toggleRecording} disabled={!stream || recordingState.phase === "starting" || recordingState.phase === "stopping"}>{recordingActive ? t.stopRecording : t.record}</button>
        </div>
      </header>
      {stream && <video ref={videoRef} className="capture-live-preview" muted playsInline />}
      {!stream && <div className="capture-empty">{t.empty}</div>}
      <div className={`capture-result ${captured ? "" : "capture-result--hidden"}`}>
          <div className="capture-editor-tools">
            {(["pen", "rectangle", "arrow", "blur", "text", "crop", "pick"] as Tool[]).map((item) => (
              <button type="button" key={item} className={tool === item ? "is-selected" : ""} onClick={() => setTool(item)}>
                {item === "pen" ? t.pen : item === "rectangle" ? t.box : item === "arrow" ? t.arrow : item === "blur" ? t.blur : item === "text" ? t.text : item === "crop" ? t.crop : t.picker}
              </button>
            ))}
            <input aria-label={t.colour} type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
          <div className="capture-canvas-wrap">
            <canvas ref={canvasRef} className="capture-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
            {tool === "pick" && magnifier && (
              <div className="capture-magnifier" style={{ left: magnifier.left, top: magnifier.top }}>
                <canvas ref={magnifierRef} width={96} height={96} />
                <span>{picked.toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="capture-colour-history">
            {colorHistory.map((hex) => <button type="button" key={hex} title={hex} style={{ background: hex }} onClick={() => setColor(hex)} />)}
            <button type="button" onClick={() => void navigator.clipboard.writeText(picked).then(() => setMessage(t.hexCopied))}>{t.copyHex}</button>
          </div>
          <footer className="capture-result-actions">
            <span className="capture-picked"><i style={{ background: picked }} />{picked.toUpperCase()}</span>
            <button type="button" onClick={() => exportCanvas("copy")}>{t.copyPng}</button>
            <button type="button" onClick={() => exportCanvas("save")}>{t.savePng}</button>
            <button type="button" onClick={addScreenshotToShelf}>{t.addToShelf}</button>
            <button type="button" onClick={scanQr}>{t.readQr}</button>
            <button type="button" onClick={extractText} disabled={ocrBusy}>{ocrBusy ? t.reading : t.extract}</button>
          </footer>
          {ocrText && <div className="capture-ocr"><textarea readOnly value={ocrText} aria-label={t.recognised} /><button type="button" onClick={copyOcrText}>{t.copyText}</button></div>}
          {qr && <div className="capture-qr"><span>{t.qrResult}</span><code>{qr}</code><button type="button" onClick={() => void navigator.clipboard.writeText(qr).then(() => setMessage(t.qrCopied))}>{t.copy}</button></div>}
      </div>
      {message && <p className="capture-message" role="status">{message}</p>}
      <p className="capture-privacy">{t.privacy}</p>
    </section>
  );
}
