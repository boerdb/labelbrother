import { MEDIA } from "@thermal-label/brother-ql-core";
import type { BrotherQLStatus } from "@thermal-label/brother-ql-core";
import { TcpTransport } from "@thermal-label/transport/node";
import sharp from "sharp";
import { getLabelSize, getPrintPixelSize } from "./labelSizes";
import { openNetworkPrinter } from "./openPrinter";
import { getPrinterHost, getPrinterPort } from "./printConfig";

const CONNECT_TIMEOUT_MS = 5000;
const STATUS_TIMEOUT_MS = 2500;

export interface RawImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface PrinterProbeResult {
  reachable: boolean;
  host: string;
  port: number;
  status: BrotherQLStatus | null;
  statusQuery: "ok" | "timeout" | "skipped";
  message: string;
}

export async function pngBase64ToRawImage(base64: string): Promise<RawImage> {
  const cleaned = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width: info.width,
    height: info.height,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
}

async function rawToPngBuffer(image: RawImage): Promise<Buffer> {
  return sharp(Buffer.from(image.data), {
    raw: { width: image.width, height: image.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function pngBufferToRaw(buffer: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
}

export async function probePrinter(): Promise<PrinterProbeResult> {
  const host = getPrinterHost();
  const port = getPrinterPort();

  try {
    const transport = await TcpTransport.connect(host, port, CONNECT_TIMEOUT_MS);
    await transport.close();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Verbinding mislukt";
    return {
      reachable: false,
      host,
      port,
      status: null,
      statusQuery: "skipped",
      message: `Geen verbinding met ${host}:${port} — ${detail}`,
    };
  }

  const printer = await openNetworkPrinter();
  try {
    const status = (await Promise.race([
      printer.getStatus(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("STATUS_TIMEOUT")), STATUS_TIMEOUT_MS);
      }),
    ])) as BrotherQLStatus;

    const media = status.detectedMedia?.name;
    return {
      reachable: true,
      host,
      port,
      status,
      statusQuery: "ok",
      message: media
        ? `Printer bereikbaar — gedetecteerde rol: ${media}`
        : "Printer bereikbaar op poort 9100",
    };
  } catch (err) {
    if (err instanceof Error && err.message === "STATUS_TIMEOUT") {
      return {
        reachable: true,
        host,
        port,
        status: null,
        statusQuery: "timeout",
        message:
          "Printer bereikbaar op poort 9100. Rolstatus kon niet worden opgehaald (normaal via netwerk) — probeer direct Druk af.",
      };
    }
    throw err;
  } finally {
    await printer.close();
  }
}

export async function printLabel(
  labelSizeId: string,
  imageBase64: string,
): Promise<void> {
  const spec = getLabelSize(labelSizeId);
  if (!spec) {
    throw new Error(`Onbekend labelformaat: ${labelSizeId}`);
  }

  const media = MEDIA[spec.mediaId];
  if (!media) {
    throw new Error(`Media-id ${spec.mediaId} niet gevonden`);
  }

  let image = await pngBase64ToRawImage(imageBase64);

  if (image.width !== spec.width || image.height !== spec.height) {
    const resized = await sharp(Buffer.from(image.data), {
      raw: { width: image.width, height: image.height, channels: 4 },
    })
      .resize(spec.width, spec.height, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    image = {
      width: resized.info.width,
      height: resized.info.height,
      data: new Uint8Array(
        resized.data.buffer,
        resized.data.byteOffset,
        resized.data.byteLength,
      ),
    };
  }

  if (spec.rotateBeforePrint) {
    const png = await rawToPngBuffer(image);
    const rotated = await sharp(png).rotate(90).png().toBuffer();
    image = await pngBufferToRaw(rotated);
  }

  const printSize = getPrintPixelSize(spec);
  if (image.width !== printSize.width) {
    const resized = await sharp(Buffer.from(image.data), {
      raw: { width: image.width, height: image.height, channels: 4 },
    })
      .resize(printSize.width, printSize.height, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    image = {
      width: resized.info.width,
      height: resized.info.height,
      data: new Uint8Array(
        resized.data.buffer,
        resized.data.byteOffset,
        resized.data.byteLength,
      ),
    };
  }

  const printer = await openNetworkPrinter();

  try {
    await printer.print(image, media, { rotate: 0 });
  } finally {
    await printer.close();
  }
}
