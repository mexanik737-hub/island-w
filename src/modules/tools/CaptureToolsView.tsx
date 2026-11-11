import { useEffect, useRef, useState, type PointerEvent } from "react";
import { recognizeImage } from "../../ipc/ocr";
import "./capture-tools.css";

type Tool = "pen" | "rectangle" | "arrow" | "pick";
type Point = { x: number; y: number };
type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
};
type DrawState = { mode: Exclude<Tool, "pick">; start: Point; last: Point; before: ImageData };

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

function drawShape(ctx: CanvasRenderingContext2D, mode: DrawState["mode"], from: Point, to: Point, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, ctx.canvas.width / 420);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (mode === "rectangle") {
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState(false);
  const [recording, setRecording] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ff6259");
  const [picked, setPicked] = useState("#000000");
  const [qr, setQr] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drawRef = useRef<DrawState | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setMessage("The selected screen could not be previewed."));
  }, [stream]);

  useEffect(() => {
    const current = streamRef;
    return () => {
      current.current?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, []);

  const chooseSource = async () => {
    setMessage("");
    setQr("");
    try {
      const next = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      streamRef.current = next;
      setStream(next);
      setCaptured(false);
      next.getVideoTracks()[0]?.addEventListener("ended", () => {
        streamRef.current = null;
        setStream(null);
        setRecording(false);
        setMessage("Screen sharing stopped.");
      }, { once: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Screen capture was cancelled.");
    }
  };

  const stopSource = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setRecording(false);
  };

  const takeScreenshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setMessage("Choose a screen or window first.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(true);
    setMessage("Screenshot ready. You can mark it up, copy it or save it.");
    setQr("");
  };

  const exportCanvas = (kind: "copy" | "save") => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setMessage("Could not export this image.");
        return;
      }
      if (kind === "save") {
        download(blob, `Island-W-${new Date().toISOString().replace(/[:.]/g, "-")}.png`);
        setMessage("PNG saved to your Downloads folder.");
        return;
      }
      try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Image clipboard is unavailable in this Windows session.");
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setMessage("Screenshot copied to the clipboard.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not copy the screenshot.");
      }
    }, "image/png");
  };

  const extractText = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    setOcrBusy(true);
    setOcrText("");
    setMessage("Recognising text locally with Windows OCR…");
    try {
      const text = await recognizeImage(canvas.toDataURL("image/png"));
      setOcrText(text);
      setMessage(text.trim() ? "Text recognised. Copy it or use it in the Text tab." : "No text was recognised in this screenshot.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setOcrBusy(false);
    }
  };

  const copyOcrText = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setMessage("Recognised text copied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not copy recognised text.");
    }
  };

  const scanQr = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !captured) return;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setMessage("QR scanning is not available in this WebView version yet.");
      return;
    }
    try {
      const detector = new Detector({ formats: ["qr_code"] });
      const results = await detector.detect(canvas);
      const value = results[0]?.rawValue ?? "";
      setQr(value);
      setMessage(value ? "QR code found." : "No QR code found in this screenshot.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QR scan failed.");
    }
  };

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const source = streamRef.current;
    if (!source) {
      setMessage("Choose a screen or window before recording.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setMessage("Screen recording is not supported by this WebView.");
      return;
    }
    const mimeType = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    try {
      const recorder = new MediaRecorder(source, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "mp4" : "webm";
        download(blob, `Island-W-recording-${Date.now()}.${ext}`);
        chunksRef.current = [];
        setRecording(false);
        setMessage("Recording saved to your Downloads folder.");
      };
      recorder.onerror = () => {
        setRecording(false);
        setMessage("The screen recording failed.");
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      setMessage("Recording screen. Press Stop recording when finished.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start recording.");
    }
  };

  const sampleColor = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const point = pointAt(event);
    const pixel = context.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;
    const hex = "#" + [...pixel.slice(0, 3)].map((channel) => channel.toString(16).padStart(2, "0")).join("");
    setPicked(hex);
    setMessage(`Picked ${hex.toUpperCase()}`);
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!captured) return;
    if (tool === "pick") {
      sampleColor(event);
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
  };

  const onPointerUp = () => {
    drawRef.current = null;
  };

  return (
    <section className="capture-tools">
      <header className="capture-tools-head">
        <div><strong>Screen tools</strong><span>Capture, mark up and record a screen or window</span></div>
        <div className="capture-tools-actions">
          {!stream ? <button type="button" onClick={chooseSource}>Choose screen</button> : <button type="button" onClick={stopSource}>Stop sharing</button>}
          <button type="button" onClick={takeScreenshot} disabled={!stream}>Screenshot</button>
          <button type="button" className={recording ? "is-recording" : ""} onClick={toggleRecording} disabled={!stream}>{recording ? "Stop recording" : "Record"}</button>
        </div>
      </header>
      {stream && <video ref={videoRef} className="capture-live-preview" muted playsInline />}
      {!stream && <div className="capture-empty">Choose a screen, app window or browser tab to get started.</div>}
      <div className={`capture-result ${captured ? "" : "capture-result--hidden"}`}>
          <div className="capture-editor-tools">
            {(["pen", "rectangle", "arrow", "pick"] as Tool[]).map((item) => (
              <button type="button" key={item} className={tool === item ? "is-selected" : ""} onClick={() => setTool(item)}>
                {item === "pen" ? "Pen" : item === "rectangle" ? "Box" : item === "arrow" ? "Arrow" : "Picker"}
              </button>
            ))}
            <input aria-label="Annotation colour" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
          <canvas ref={canvasRef} className="capture-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
          <footer className="capture-result-actions">
            <span className="capture-picked"><i style={{ background: picked }} />{picked.toUpperCase()}</span>
            <button type="button" onClick={() => exportCanvas("copy")}>Copy PNG</button>
            <button type="button" onClick={() => exportCanvas("save")}>Save PNG</button>
            <button type="button" onClick={scanQr}>Read QR</button>
            <button type="button" onClick={extractText} disabled={ocrBusy}>{ocrBusy ? "Reading…" : "Extract text"}</button>
          </footer>
          {ocrText && <div className="capture-ocr"><textarea readOnly value={ocrText} aria-label="Recognised text" /><button type="button" onClick={copyOcrText}>Copy text</button></div>}
          {qr && <div className="capture-qr"><span>QR result</span><code>{qr}</code><button type="button" onClick={() => void navigator.clipboard.writeText(qr).then(() => setMessage("QR result copied."))}>Copy</button></div>}
      </div>
      {message && <p className="capture-message" role="status">{message}</p>}
      <p className="capture-privacy">Capture and recording start only after you choose a source. Files are created locally in Downloads.</p>
    </section>
  );
}
