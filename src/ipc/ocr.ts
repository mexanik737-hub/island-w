import { invoke } from "@tauri-apps/api/core";

/** Runs Windows.Media.Ocr on this PC; the image never leaves the machine. */
export const recognizeImage = (imageDataUrl: string) =>
  invoke<string>("ocr_image", { imageBase64: imageDataUrl });
