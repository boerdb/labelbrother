export type IconCategory = "medisch" | "waarschuwing" | "huis" | "pijlen" | "it";

export interface IconDef {
  id: string;
  label: string;
  src: string;
  category: IconCategory;
}

export const ICON_CATEGORY_LABELS: Record<IconCategory | "all", string> = {
  all: "Alles",
  medisch: "Medisch",
  waarschuwing: "Waarschuwing",
  huis: "Huis & werk",
  pijlen: "Pijlen & tekens",
  it: "IT",
};

export const ICON_LIBRARY: IconDef[] = [
  { id: "medical-cross", label: "Kruis", category: "medisch", src: "/icons/medical-cross.svg" },
  { id: "heart", label: "Hart", category: "medisch", src: "/icons/heart.svg" },
  { id: "activity", label: "Hartslag", category: "medisch", src: "/icons/activity.svg" },
  { id: "pill", label: "Pil", category: "medisch", src: "/icons/pill.svg" },
  { id: "capsule", label: "Capsule", category: "medisch", src: "/icons/capsule.svg" },
  { id: "syringe", label: "Spuit", category: "medisch", src: "/icons/syringe.svg" },
  { id: "iv-drip", label: "Infuus", category: "medisch", src: "/icons/iv-drip.svg" },
  { id: "thermometer", label: "Thermometer", category: "medisch", src: "/icons/thermometer.svg" },
  { id: "stethoscope", label: "Stethoscoop", category: "medisch", src: "/icons/stethoscope.svg" },
  { id: "droplet", label: "Druppel", category: "medisch", src: "/icons/droplet.svg" },
  { id: "lungs", label: "Longen", category: "medisch", src: "/icons/lungs.svg" },
  { id: "bandage", label: "Verband", category: "medisch", src: "/icons/bandage.svg" },
  { id: "hospital", label: "Ziekenhuis", category: "medisch", src: "/icons/hospital.svg" },
  { id: "bed", label: "Bed", category: "medisch", src: "/icons/bed.svg" },
  { id: "ambulance", label: "Ambulance", category: "medisch", src: "/icons/ambulance.svg" },
  { id: "flask", label: "Flesje", category: "medisch", src: "/icons/flask.svg" },
  { id: "clipboard", label: "Dossier", category: "medisch", src: "/icons/clipboard.svg" },
  { id: "mask", label: "Masker", category: "medisch", src: "/icons/mask.svg" },
  { id: "virus", label: "Virus", category: "medisch", src: "/icons/virus.svg" },
  { id: "dna", label: "DNA", category: "medisch", src: "/icons/dna.svg" },
  { id: "eye", label: "Oog", category: "medisch", src: "/icons/eye.svg" },
  { id: "ear", label: "Oor", category: "medisch", src: "/icons/ear.svg" },
  { id: "brain", label: "Brein", category: "medisch", src: "/icons/brain.svg" },
  { id: "baby", label: "Kind", category: "medisch", src: "/icons/baby.svg" },
  { id: "wheelchair", label: "Rolstoel", category: "medisch", src: "/icons/wheelchair.svg" },
  { id: "fridge", label: "Koelkast", category: "medisch", src: "/icons/fridge.svg" },
  { id: "snowflake", label: "Koelen", category: "medisch", src: "/icons/snowflake.svg" },
  { id: "shield-plus", label: "Bescherming", category: "medisch", src: "/icons/shield-plus.svg" },
  { id: "warning", label: "Waarschuwing", category: "waarschuwing", src: "/icons/warning.svg" },
  { id: "alert-octagon", label: "Let op", category: "waarschuwing", src: "/icons/alert-octagon.svg" },
  { id: "biohazard", label: "Biohazard", category: "waarschuwing", src: "/icons/biohazard.svg" },
  { id: "radiation", label: "Straling", category: "waarschuwing", src: "/icons/radiation.svg" },
  { id: "fire", label: "Brand", category: "waarschuwing", src: "/icons/fire.svg" },
  { id: "no-entry", label: "Verboden", category: "waarschuwing", src: "/icons/no-entry.svg" },
  { id: "lightning", label: "Elektrisch", category: "waarschuwing", src: "/icons/lightning.svg" },
  { id: "info", label: "Info", category: "waarschuwing", src: "/icons/info.svg" },
  { id: "home", label: "Huis", category: "huis", src: "/icons/home.svg" },
  { id: "plug", label: "Stekker", category: "huis", src: "/icons/plug.svg" },
  { id: "lamp", label: "Lamp", category: "huis", src: "/icons/lamp.svg" },
  { id: "water", label: "Water", category: "huis", src: "/icons/water.svg" },
  { id: "box", label: "Doos", category: "huis", src: "/icons/box.svg" },
  { id: "calendar", label: "Kalender", category: "huis", src: "/icons/calendar.svg" },
  { id: "clock", label: "Klok", category: "huis", src: "/icons/clock.svg" },
  { id: "person", label: "Persoon", category: "huis", src: "/icons/person.svg" },
  { id: "phone", label: "Telefoon", category: "huis", src: "/icons/phone.svg" },
  { id: "lock", label: "Slot", category: "huis", src: "/icons/lock.svg" },
  { id: "wifi", label: "Wifi", category: "huis", src: "/icons/wifi.svg" },
  { id: "battery", label: "Batterij", category: "huis", src: "/icons/battery.svg" },
  { id: "recycle", label: "Recycle", category: "huis", src: "/icons/recycle.svg" },
  { id: "trash", label: "Afval", category: "huis", src: "/icons/trash.svg" },
  { id: "arrow-right", label: "Pijl rechts", category: "pijlen", src: "/icons/arrow-right.svg" },
  { id: "arrow-left", label: "Pijl links", category: "pijlen", src: "/icons/arrow-left.svg" },
  { id: "arrow-up", label: "Pijl omhoog", category: "pijlen", src: "/icons/arrow-up.svg" },
  { id: "arrow-down", label: "Pijl omlaag", category: "pijlen", src: "/icons/arrow-down.svg" },
  { id: "check", label: "Vinkje", category: "pijlen", src: "/icons/check.svg" },
  { id: "x-mark", label: "Kruisje", category: "pijlen", src: "/icons/x-mark.svg" },
  { id: "plus", label: "Plus", category: "pijlen", src: "/icons/plus.svg" },
  { id: "minus", label: "Min", category: "pijlen", src: "/icons/minus.svg" },
  { id: "star", label: "Ster", category: "pijlen", src: "/icons/star.svg" },
];

const extraIcons = new Map<string, IconDef>();

export function registerExtraIcons(icons: IconDef[]): void {
  for (const icon of icons) extraIcons.set(icon.id, icon);
}

export function unregisterPackIcons(packId: string): void {
  const prefix = `${packId}:`;
  for (const id of extraIcons.keys()) {
    if (id.startsWith(prefix)) extraIcons.delete(id);
  }
}

export function getExtraIcons(packId?: string): IconDef[] {
  const all = [...extraIcons.values()];
  if (!packId) return all;
  const prefix = `${packId}:`;
  return all.filter((icon) => icon.id.startsWith(prefix));
}

export function getAllIcons(): IconDef[] {
  return [...ICON_LIBRARY, ...extraIcons.values()];
}

export function getIconSrc(iconId: string): string | undefined {
  return ICON_LIBRARY.find((i) => i.id === iconId)?.src ?? extraIcons.get(iconId)?.src;
}
