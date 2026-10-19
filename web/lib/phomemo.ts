"use client";

/**
 * Phomemo (M110 e.d.) via Web Bluetooth — zelfde protocol als C:\DEV\print-adres-app:
 * ESC/POS raster (GS v 0), 8 dots/mm, 90° gedraaid, chunks van 192 bytes met 25 ms pauze.
 * Werkt in Chrome/Edge (desktop en Android) via HTTPS of localhost. Niet in Safari/iOS.
 */

const LAST_DEVICE_ID_KEY = "phomemo.lastDeviceId";
const CHUNK_SIZE = 192;
const CHUNK_DELAY = 25;
export const PHOMEMO_DOTS_PER_MM = 8;

const PROFILE_CANDIDATES = [
  {
    service: "0000ff00-0000-1000-8000-00805f9b34fb",
    writeChar: "0000ff02-0000-1000-8000-00805f9b34fb",
    notifyChar: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  {
    service: "000018f0-0000-1000-8000-00805f9b34fb",
    writeChar: "00002af1-0000-1000-8000-00805f9b34fb",
    notifyChar: null,
  },
  {
    service: "0000ae30-0000-1000-8000-00805f9b34fb",
    writeChar: "0000ae01-0000-1000-8000-00805f9b34fb",
    notifyChar: "0000ae02-0000-1000-8000-00805f9b34fb",
  },
] as const;

export interface PhomemoLabel {
  /** Lengte langs de voeding (mm). */
  lengthMm: number;
  /** Bedrukbare breedte over de printkop (mm). */
  widthMm: number;
}

export const DEFAULT_PHOMEMO_LABEL: PhomemoLabel = { lengthMm: 80, widthMm: 43 };

function normalizeUuid(uuid: string): string {
  const u = uuid.toLowerCase();
  if (u.includes("-")) return u;
  if (u.length === 4) return `0000${u}-0000-1000-8000-00805f9b34fb`;
  if (u.length === 8) return `${u}-0000-1000-8000-00805f9b34fb`;
  return u;
}

export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
}

/** ESC/POS bitmap uit canvas, 90° gedraaid: canvas-Y loopt over de printkop. */
function canvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context kon niet worden gemaakt.");

  const srcWidth = canvas.width;
  const srcHeight = canvas.height;
  const pixels = ctx.getImageData(0, 0, srcWidth, srcHeight).data;

  const newWidth = srcHeight;
  const newHeight = srcWidth;
  const bytesPerRow = Math.ceil(newWidth / 8);

  const header = [
    0x1b, 0x40,
    0x1d, 0x76, 0x30, 0x00,
    bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
    newHeight & 0xff, (newHeight >> 8) & 0xff,
  ];
  const out = new Uint8Array(header.length + bytesPerRow * newHeight);
  out.set(header);
  let o = header.length;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < bytesPerRow; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const newX = x * 8 + bit;
        if (newX >= newWidth) continue;
        const idx = ((newWidth - 1 - newX) * srcWidth + y) * 4;
        const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        if (brightness < 128) byte |= 0x80 >> bit;
      }
      out[o++] = byte;
    }
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Labelafbeelding kon niet worden geladen"));
    img.src = src;
  });
}

/** Schaal het ontwerp passend (met behoud van verhouding) en gecentreerd op het Phomemo-label. */
export async function renderForPhomemo(pngDataUrl: string, label: PhomemoLabel): Promise<HTMLCanvasElement> {
  const img = await loadImage(pngDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(label.lengthMm * PHOMEMO_DOTS_PER_MM);
  canvas.height = Math.round(label.widthMm * PHOMEMO_DOTS_PER_MM);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context kon niet worden gemaakt.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  return canvas;
}

export class PhomemoPrinter {
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private batteryLevel: number | null = null;
  private listeners = new Set<() => void>();

  onStateChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  isConnected(): boolean {
    return Boolean(this.device?.gatt?.connected && this.writeChar);
  }

  getDeviceName(): string | null {
    return this.device ? this.device.name || this.device.id : null;
  }

  getBatteryLevel(): number | null {
    return this.batteryLevel;
  }

  /** Opent de Bluetooth-kiezer; moet vanuit een klik/toets worden aangeroepen. */
  async connect(): Promise<boolean> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth niet beschikbaar. Gebruik Chrome of Edge (via HTTPS of localhost).");
    }
    const optionalServices: string[] = PROFILE_CANDIDATES.map((p) => p.service);
    optionalServices.push("battery_service");
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices });
      await this.attach(device);
      return true;
    } catch (e) {
      console.warn("Phomemo koppelen mislukt:", e);
      if (!(e instanceof DOMException)) throw e;
      // NotFoundError is zowel "kiezer gesloten" als "geen adapter / geen apparaat".
      if (e.name === "NotFoundError" && /cancel/i.test(e.message)) return false;
      throw new Error(`Bluetooth: ${e.message || e.name}`);
    }
  }

  /** Herverbind stil met de laatst gekozen printer (Chrome: alleen als getDevices() beschikbaar is). */
  async autoReconnect(): Promise<boolean> {
    if (!navigator.bluetooth?.getDevices) return false;
    const savedId = readStorage(LAST_DEVICE_ID_KEY);
    if (!savedId) return false;
    try {
      const devices = await navigator.bluetooth.getDevices();
      const match = devices.find((d) => d.id === savedId);
      if (!match) return false;
      await this.attach(match);
      return true;
    } catch (e) {
      console.warn("Phomemo auto-reconnect mislukt:", e);
      return false;
    }
  }

  forget(): void {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.writeChar = null;
    this.batteryLevel = null;
    try {
      localStorage.removeItem(LAST_DEVICE_ID_KEY);
    } catch {
      /* ignore */
    }
    this.notify();
  }

  async print(canvas: HTMLCanvasElement): Promise<void> {
    if (!this.isConnected()) {
      if (!this.device) throw new Error("Phomemo niet gekoppeld. Koppel eerst de printer.");
      await this.attach(this.device);
    }
    const char = this.writeChar!;
    const data = canvasToEscPosRaster(canvas);
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      // Phomemo + Web Bluetooth: writeWithoutResponse is vaak vereist.
      if (char.properties.writeWithoutResponse) await char.writeValueWithoutResponse(chunk);
      else await char.writeValue(chunk);
      await new Promise((r) => setTimeout(r, CHUNK_DELAY));
    }
  }

  private async attach(device: BluetoothDevice): Promise<void> {
    const server = device.gatt;
    if (!server) throw new Error("GATT niet beschikbaar op dit apparaat.");
    if (!server.connected) await server.connect();

    if (this.device !== device) {
      device.addEventListener("gattserverdisconnected", () => {
        this.writeChar = null;
        this.batteryLevel = null;
        this.notify();
      });
    }
    this.device = device;
    this.writeChar = await this.resolveWriteChar(server);
    await this.enableNotifications(server);
    await this.readBattery(server);
    writeStorage(LAST_DEVICE_ID_KEY, device.id);
    this.notify();
  }

  private async resolveWriteChar(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic> {
    for (const candidate of PROFILE_CANDIDATES) {
      try {
        const service = await server.getPrimaryService(candidate.service);
        const chars = await service.getCharacteristics();
        const writeChar = chars.find(
          (c) =>
            normalizeUuid(c.uuid) === candidate.writeChar &&
            (c.properties.write || c.properties.writeWithoutResponse),
        );
        if (writeChar) return writeChar;
      } catch {
        /* volgend profiel */
      }
    }
    throw new Error("Geen Phomemo-printer: geen schrijfbare BLE characteristic gevonden.");
  }

  /** M110 verwacht vaak notify op ff03 vóór het printen. */
  private async enableNotifications(server: BluetoothRemoteGATTServer): Promise<void> {
    for (const candidate of PROFILE_CANDIDATES) {
      if (!candidate.notifyChar) continue;
      try {
        const service = await server.getPrimaryService(candidate.service);
        const chars = await service.getCharacteristics();
        const notifyChar = chars.find(
          (c) =>
            normalizeUuid(c.uuid) === candidate.notifyChar &&
            (c.properties.notify || c.properties.indicate),
        );
        if (!notifyChar) continue;
        await notifyChar.startNotifications();
        return;
      } catch {
        /* volgend profiel */
      }
    }
  }

  private async readBattery(server: BluetoothRemoteGATTServer): Promise<void> {
    try {
      const service = await server.getPrimaryService("battery_service");
      const level = await service.getCharacteristic("battery_level");
      const value = await level.readValue();
      const pct = value.byteLength > 0 ? value.getUint8(0) : 255;
      this.batteryLevel = pct <= 100 ? pct : null;
    } catch {
      this.batteryLevel = null;
    }
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

let instance: PhomemoPrinter | null = null;

export function getPhomemoPrinter(): PhomemoPrinter {
  instance ??= new PhomemoPrinter();
  return instance;
}
