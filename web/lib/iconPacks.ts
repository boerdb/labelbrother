import type { IconCategory, IconDef } from "./icons";

export interface PackIconSpec {
  name: string;
  label: string;
  category: IconCategory;
}

export interface IconPackDef {
  id: string;
  name: string;
  description: string;
  license: string;
  /** Iconify-collectie, zie iconify.design */
  prefix: string;
  builtin?: boolean;
  icons: PackIconSpec[];
}

export const ICON_PACKS: IconPackDef[] = [
  {
    id: "builtin",
    name: "Standaard",
    description: "Al ingebouwd, geen download nodig",
    license: "Ingebouwd",
    prefix: "",
    builtin: true,
    icons: [],
  },
  {
    id: "healthicons",
    name: "Health Icons",
    description: "Extra medische pictogrammen (WHO-stijl)",
    license: "MIT — healthicons.org",
    prefix: "healthicons",
    icons: [
      { name: "ambulance-outline", label: "Ambulance", category: "medisch" },
      { name: "bandaged-outline", label: "Verband", category: "medisch" },
      { name: "blood-bag-outline", label: "Bloedzak", category: "medisch" },
      { name: "blood-drop-outline", label: "Bloeddruppel", category: "medisch" },
      { name: "body-outline", label: "Lichaam", category: "medisch" },
      { name: "neurology-outline", label: "Neurologie", category: "medisch" },
      { name: "clinical-f-outline", label: "Kliniek", category: "medisch" },
      { name: "cold-chain-outline", label: "Koelketen", category: "medisch" },
      { name: "defibrillator-outline", label: "Defibrillator", category: "medisch" },
      { name: "diabetes-outline", label: "Diabetes", category: "medisch" },
      { name: "ear-nose-throat-outline", label: "KNO", category: "medisch" },
      { name: "emergency-post-outline", label: "SEH", category: "medisch" },
      { name: "eye-outline", label: "Oog", category: "medisch" },
      { name: "health-outline", label: "Gezondheid", category: "medisch" },
      { name: "heart-cardiogram-outline", label: "ECG", category: "medisch" },
      { name: "hospital-outline", label: "Ziekenhuis", category: "medisch" },
      { name: "hospital-symbol-outline", label: "Ziekenhuiskruis", category: "medisch" },
      { name: "syringe-vaccine-outline", label: "Vaccinatie", category: "medisch" },
      { name: "intravenous-drip-outline", label: "Infuus", category: "medisch" },
      { name: "kidneys-outline", label: "Nieren", category: "medisch" },
      { name: "lab-search-outline", label: "Lab", category: "medisch" },
      { name: "lungs-outline", label: "Longen", category: "medisch" },
      { name: "medicine-bottle-outline", label: "Flesje", category: "medisch" },
      { name: "medicine-mortar-outline", label: "Vijzel", category: "medisch" },
      { name: "medicines-outline", label: "Medicijnen", category: "medisch" },
      { name: "nutrition-outline", label: "Voeding", category: "medisch" },
      { name: "oxygen-tank-outline", label: "Zuurstof", category: "medisch" },
      { name: "pharmacy-outline", label: "Apotheek", category: "medisch" },
      { name: "ppe-face-mask-outline", label: "Mondmasker", category: "medisch" },
      { name: "ppe-gloves-outline", label: "Handschoenen", category: "medisch" },
      { name: "pregnant-outline", label: "Zwanger", category: "medisch" },
      { name: "rx-outline", label: "Recept", category: "medisch" },
      { name: "stethoscope-outline", label: "Stethoscoop", category: "medisch" },
      { name: "syringe-outline", label: "Spuit", category: "medisch" },
      { name: "tooth-outline", label: "Gebit", category: "medisch" },
      { name: "thermometer-digital-outline", label: "Thermometer", category: "medisch" },
      { name: "ultrasound-scanner-outline", label: "Echo", category: "medisch" },
      { name: "asthma-outline", label: "Astma", category: "medisch" },
      { name: "ventilator-outline", label: "Beademing", category: "medisch" },
      { name: "virus-lab-research-test-tube-outline", label: "Buisjes", category: "medisch" },
      { name: "virus-outline", label: "Virus", category: "medisch" },
      { name: "wheelchair-outline", label: "Rolstoel", category: "medisch" },
      { name: "xray-outline", label: "Röntgen", category: "medisch" },
    ],
  },
  {
    id: "lucide-extra",
    name: "Lucide extra",
    description: "Heldere lijn-iconen voor labels",
    license: "ISC — lucide.dev",
    prefix: "lucide",
    icons: [
      { name: "activity", label: "Hartslag", category: "medisch" },
      { name: "ambulance", label: "Ambulance", category: "medisch" },
      { name: "bandage", label: "Pleister", category: "medisch" },
      { name: "biohazard", label: "Biohazard", category: "waarschuwing" },
      { name: "brain", label: "Brein", category: "medisch" },
      { name: "briefcase-medical", label: "Medische tas", category: "medisch" },
      { name: "cross", label: "Kruis", category: "medisch" },
      { name: "dna", label: "DNA", category: "medisch" },
      { name: "droplet", label: "Druppel", category: "medisch" },
      { name: "heart-pulse", label: "Hartpuls", category: "medisch" },
      { name: "hospital", label: "Ziekenhuis", category: "medisch" },
      { name: "pill", label: "Pil", category: "medisch" },
      { name: "radiation", label: "Straling", category: "waarschuwing" },
      { name: "scan-heart", label: "Hart-scan", category: "medisch" },
      { name: "shield-plus", label: "Bescherming", category: "medisch" },
      { name: "siren", label: "Sirene", category: "waarschuwing" },
      { name: "stethoscope", label: "Stethoscoop", category: "medisch" },
      { name: "syringe", label: "Spuit", category: "medisch" },
      { name: "thermometer", label: "Thermometer", category: "medisch" },
      { name: "truck", label: "Transport", category: "huis" },
    ],
  },
  {
    id: "it-symbolen",
    name: "IT-symbolen",
    description: "Netwerk, servers, computers en beveiliging",
    license: "ISC — lucide.dev",
    prefix: "lucide",
    icons: [
      { name: "wifi", label: "Wifi", category: "it" },
      { name: "wifi-off", label: "Geen wifi", category: "it" },
      { name: "server", label: "Server", category: "it" },
      { name: "database", label: "Database", category: "it" },
      { name: "cloud", label: "Cloud", category: "it" },
      { name: "cloud-off", label: "Geen cloud", category: "it" },
      { name: "hard-drive", label: "Schijf", category: "it" },
      { name: "hard-drive-download", label: "Download", category: "it" },
      { name: "monitor", label: "Monitor", category: "it" },
      { name: "laptop", label: "Laptop", category: "it" },
      { name: "smartphone", label: "Telefoon", category: "it" },
      { name: "printer", label: "Printer", category: "it" },
      { name: "keyboard", label: "Toetsenbord", category: "it" },
      { name: "mouse", label: "Muis", category: "it" },
      { name: "webcam", label: "Webcam", category: "it" },
      { name: "usb", label: "USB", category: "it" },
      { name: "ethernet-port", label: "Netwerkpoort", category: "it" },
      { name: "network", label: "Netwerk", category: "it" },
      { name: "router", label: "Router", category: "it" },
      { name: "cable", label: "Kabel", category: "it" },
      { name: "plug", label: "Stekker", category: "it" },
      { name: "unplug", label: "Ontkoppel", category: "it" },
      { name: "power", label: "Aan/uit", category: "it" },
      { name: "battery", label: "Batterij", category: "it" },
      { name: "cpu", label: "CPU", category: "it" },
      { name: "memory-stick", label: "Geheugen", category: "it" },
      { name: "bluetooth", label: "Bluetooth", category: "it" },
      { name: "antenna", label: "Antenne", category: "it" },
      { name: "radio-tower", label: "Mast", category: "it" },
      { name: "satellite", label: "Satelliet", category: "it" },
      { name: "globe", label: "Internet", category: "it" },
      { name: "mail", label: "E-mail", category: "it" },
      { name: "folder", label: "Map", category: "it" },
      { name: "code", label: "Code", category: "it" },
      { name: "terminal", label: "Terminal", category: "it" },
      { name: "binary", label: "Binair", category: "it" },
      { name: "bug", label: "Bug", category: "it" },
      { name: "git-branch", label: "Git", category: "it" },
      { name: "qr-code", label: "QR-code", category: "it" },
      { name: "scan-barcode", label: "Barcode", category: "it" },
      { name: "lock", label: "Slot", category: "it" },
      { name: "key", label: "Sleutel", category: "it" },
      { name: "shield", label: "Beveiliging", category: "it" },
      { name: "settings", label: "Instellingen", category: "it" },
    ],
  },
  {
    id: "tabler-zorg",
    name: "Tabler zorg",
    description: "Zorg, huis en pijlen",
    license: "MIT — tabler.io/icons",
    prefix: "tabler",
    icons: [
      { name: "ambulance", label: "Ambulance", category: "medisch" },
      { name: "crutches", label: "Krukken", category: "medisch" },
      { name: "disabled", label: "Toegankelijk", category: "medisch" },
      { name: "emergency-bed", label: "Spoedbed", category: "medisch" },
      { name: "first-aid-kit", label: "EHBO-koffer", category: "medisch" },
      { name: "heartbeat", label: "Hartslag", category: "medisch" },
      { name: "medical-cross", label: "Kruis", category: "medisch" },
      { name: "medicine-syrup", label: "Siroop", category: "medisch" },
      { name: "nurse", label: "Verpleegkundige", category: "medisch" },
      { name: "pill", label: "Pil", category: "medisch" },
      { name: "prescription", label: "Recept", category: "medisch" },
      { name: "vaccine", label: "Vaccin", category: "medisch" },
      { name: "vaccine-bottle", label: "Vaccinflesje", category: "medisch" },
      { name: "wheelchair", label: "Rolstoel", category: "medisch" },
      { name: "alert-triangle", label: "Waarschuwing", category: "waarschuwing" },
      { name: "biohazard", label: "Biohazard", category: "waarschuwing" },
      { name: "radioactive", label: "Straling", category: "waarschuwing" },
      { name: "home-heart", label: "Thuiszorg", category: "huis" },
      { name: "fridge", label: "Koelkast", category: "huis" },
      { name: "arrow-big-right", label: "Pijl", category: "pijlen" },
    ],
  },
  {
    id: "mdi-gevaar",
    name: "Material gevaar",
    description: "Waarschuwings- en gevaartekens",
    license: "Apache 2.0 — pictogrammers.com",
    prefix: "mdi",
    icons: [
      { name: "alert", label: "Alert", category: "waarschuwing" },
      { name: "alert-octagon", label: "Stop", category: "waarschuwing" },
      { name: "biohazard", label: "Biohazard", category: "waarschuwing" },
      { name: "fire-alert", label: "Brand", category: "waarschuwing" },
      { name: "flash-alert", label: "Elektrisch", category: "waarschuwing" },
      { name: "gas-cylinder", label: "Gasfles", category: "waarschuwing" },
      { name: "radioactive", label: "Radioactief", category: "waarschuwing" },
      { name: "skull-crossbones", label: "Giftig", category: "waarschuwing" },
      { name: "liquid-spot", label: "Vloeistof", category: "waarschuwing" },
      { name: "water-alert", label: "Watergevaar", category: "waarschuwing" },
      { name: "snowflake-alert", label: "Koud", category: "waarschuwing" },
      { name: "thermometer-alert", label: "Temperatuur", category: "waarschuwing" },
      { name: "hospital-box", label: "EHBO", category: "medisch" },
      { name: "needle", label: "Naald", category: "medisch" },
      { name: "pill", label: "Pil", category: "medisch" },
    ],
  },
];

export function getIconPack(id: string): IconPackDef | undefined {
  return ICON_PACKS.find((pack) => pack.id === id);
}

export function packIconId(packId: string, name: string): string {
  return `${packId}:${name}`;
}

export function toPrintSvgDataUrl(body: string, size = 24): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body.replace(/currentColor/gi, "#000")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function iconsFromIconify(
  pack: IconPackDef,
  payload: {
    icons?: Record<string, { body: string }>;
    width?: number;
    height?: number;
  },
): IconDef[] {
  const size = payload.width ?? payload.height ?? 24;
  const result: IconDef[] = [];
  for (const spec of pack.icons) {
    const body = payload.icons?.[spec.name]?.body;
    if (!body) continue;
    result.push({
      id: packIconId(pack.id, spec.name),
      label: spec.label,
      category: spec.category,
      src: toPrintSvgDataUrl(body, size),
    });
  }
  return result;
}
