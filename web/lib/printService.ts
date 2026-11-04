import { MEDIA, encodeJobForEngine, flipHorizontal, renderImage } from "@thermal-label/brother-ql-core";
import type { BrotherQLStatus } from "@thermal-label/brother-ql-core";
import { TcpTransport } from "@thermal-label/transport/node";
import sharp from "sharp";
import { getLabelSize, getPrintPixelSize } from "./labelSizes";
import { openNetworkPrinter, resolveQlDevice } from "./openPrinter";
import { getPrinterDeviceKey, getPrinterHost, getPrinterPort } from "./printConfig";

const CONNECT_TIMEOUT_MS = 5000;
const STATUS_TIMEOUT_MS = 2500;
/** Zelfde tempo als de driver: de QL-820 loopt vast op één grote schrijfactie. */
const WRITE_CHUNK_SIZE = 1024;
const WRITE_CHUNK_DELAY_MS = 20;

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

/**
 * De encoder zet het paginanummer in het derde byte van het aantal rasterregels, waardoor de
 * printer elk label na het eerste weigert ("gegevensomvang te groot"). Volgens de Brother-
 * specificatie is ESC i z: n1-n4, n5-n8 = aantal regels, n9 = 0 op de eerste pagina, anders 1.
 */
function fixPrintInfo(bytes: Uint8Array, copies: number, rowCount: number): void {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const printInfo = Buffer.from([0x1b, 0x69, 0x7a]);
  const first = data.indexOf(printInfo);
  // Elke pagina is even lang en begint met raster-modus (4 bytes) en statusverzoek (3 bytes).
  const pageLength = (data.length - (first - 7)) / copies;
  for (let page = 0; page < copies; page++) {
    const at = first + page * pageLength;
    if (!data.subarray(at, at + 3).equals(printInfo)) {
      throw new Error("Printopdracht kon niet worden opgebouwd");
    }
    data.writeUInt32LE(rowCount, at + 7);
    data[at + 11] = page === 0 ? 0 : 1;
  }
}

export async function printLabel(
  labelSizeId: string,
  imageBase64: string,
  copies = 1,
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

  // printer.print() van de driver negeert `copies`, dus de job zelf coderen: één job met
  // meerdere pagina's, waarbij de printer na elke pagina snijdt.
  const device = resolveQlDevice(getPrinterDeviceKey());
  const bitmap = flipHorizontal(renderImage(image, { dither: true, rotate: 0 }));
  const bytes = encodeJobForEngine([{ bitmap, media }], { copies }, device.engines[0], device.name);
  fixPrintInfo(bytes, copies, bitmap.heightPx);

  const transport = await TcpTransport.connect(getPrinterHost(), getPrinterPort());
  try {
    for (let off = 0; off < bytes.length; off += WRITE_CHUNK_SIZE) {
      await transport.write(bytes.subarray(off, off + WRITE_CHUNK_SIZE));
      await new Promise((r) => setTimeout(r, WRITE_CHUNK_DELAY_MS));
    }
  } finally {
    await transport.close();
  }
}
