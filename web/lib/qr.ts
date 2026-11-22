import QRCode from "qrcode";

/** Witte rand rond de code, in modules (blokjes). */
export const QR_QUIET_MODULES = 2;
/** Onder deze blokjesmaat (in printerdots) wordt scannen onbetrouwbaar. */
export const QR_MIN_MODULE_DOTS = 4;

export interface QrMatrix {
  count: number;
  isDark: (row: number, col: number) => boolean;
}

const cache = new Map<string, QrMatrix | null>();

/** Bouwt de QR-matrix (foutcorrectie M). Geeft null als de tekst te lang is. */
export function qrMatrix(text: string): QrMatrix | null {
  const value = text.length > 0 ? text : " ";
  if (cache.has(value)) return cache.get(value)!;
  let result: QrMatrix | null = null;
  try {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    result = {
      count: modules.size,
      isDark: (r, c) => Boolean(modules.get(r, c)),
    };
  } catch {
    result = null;
  }
  if (cache.size > 50) cache.clear();
  cache.set(value, result);
  return result;
}

/** Blokjesmaat in hele printerdots, zodat elk blokje scherp zwart of wit is. */
export function qrModuleDots(size: number, count: number): number {
  return Math.floor(size / (count + QR_QUIET_MODULES * 2));
}

/**
 * Tekent de QR-code op een canvas van precies `size`×`size` dots.
 * De code staat in het midden; de rest is wit.
 */
export function renderQrCanvas(text: string, size: number): HTMLCanvasElement {
  const px = Math.max(1, Math.round(size));
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);
  const matrix = qrMatrix(text);
  if (!matrix) return canvas;
  const m = Math.max(1, qrModuleDots(px, matrix.count));
  const offset = Math.floor((px - m * matrix.count) / 2);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < matrix.count; r++) {
    for (let c = 0; c < matrix.count; c++) {
      if (matrix.isDark(r, c)) ctx.fillRect(offset + c * m, offset + r * m, m, m);
    }
  }
  return canvas;
}

/** Als data-URL, voor de SVG-voorbeelden van sjablonen. */
export function qrDataUrl(text: string, size: number): string {
  return renderQrCanvas(text, size).toDataURL("image/png");
}
