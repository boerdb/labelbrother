export function getPrinterHost(): string {
  return process.env.PRINTER_HOST ?? "192.168.1.215";
}

export function getPrinterPort(): number {
  return parseInt(process.env.PRINTER_PORT ?? "9100", 10);
}

export function getDefaultLabel(): string {
  return process.env.DEFAULT_LABEL ?? "85x62";
}

/** Brother device registry key — discovery.openPrinter({ host }) kiest anders PT-E550W. */
export function getPrinterDeviceKey(): string {
  return process.env.PRINTER_DEVICE_KEY ?? "QL_820NWBc";
}

export function getApiKey(): string | undefined {
  const raw = process.env.API_KEY;
  if (raw == null || typeof raw !== "string") {
    return undefined;
  }
  const key = raw.trim();
  return key.length > 0 ? key : undefined;
}
