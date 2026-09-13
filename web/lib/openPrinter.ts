import { DEVICES, type BrotherQLDevice } from "@thermal-label/brother-ql-core";
import { BrotherQLPrinter } from "@thermal-label/brother-ql-node";
import { TcpTransport } from "@thermal-label/transport/node";
import { getPrinterDeviceKey, getPrinterHost, getPrinterPort } from "./printConfig";

export function resolveQlDevice(deviceKey: string): BrotherQLDevice {
  const device = DEVICES[deviceKey as keyof typeof DEVICES];
  if (!device) {
    throw new Error(`Onbekend printermodel (deviceKey): ${deviceKey}`);
  }
  if (!device.transports.tcp) {
    throw new Error(`${device.name} ondersteunt geen netwerkprint (TCP)`);
  }
  return device;
}

/** Netwerkprinter openen met expliciet QL-model (niet de verkeerde PT-E550W-default). */
export async function openNetworkPrinter(): Promise<BrotherQLPrinter> {
  const host = getPrinterHost();
  const port = getPrinterPort();
  const device = resolveQlDevice(getPrinterDeviceKey());
  const transport = await TcpTransport.connect(host, port);
  return new BrotherQLPrinter(device, transport, "tcp");
}
