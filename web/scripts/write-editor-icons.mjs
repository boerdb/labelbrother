import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const paths = {
  "medical-cross": `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>`,
  heart: `<path d="M12 20S5 15.5 5 10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>`,
  activity: `<path d="M3 12h4l2-7 6 14 2-7h4"/>`,
  pill: `<path d="M9.5 4.5 19.5 14.5a3.5 3.5 0 0 1-5 5L4.5 9.5a3.5 3.5 0 0 1 5-5z"/><path d="M8.5 10.5 13.5 5.5"/>`,
  capsule: `<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>`,
  syringe: `<path d="M14 3l7 7M16.5 5.5l-9 9L5 20l5.5-2.5 9-9"/><path d="M8 11l5 5M3 21l3-1"/>`,
  "iv-drip": `<path d="M8 3h8l1 5H7L8 3z"/><path d="M7 8h10M12 8v8"/><circle cx="12" cy="19" r="2"/>`,
  thermometer: `<path d="M10 13V6a2 2 0 1 1 4 0v7a3.5 3.5 0 1 1-4 0z"/><path d="M12 8v6"/>`,
  stethoscope: `<path d="M6 4v6a4 4 0 0 0 8 0V4M6 4H4M14 4h2"/><path d="M14 14a4 4 0 1 0 4 4"/><circle cx="18" cy="18" r="2"/>`,
  droplet: `<path d="M12 3s7 8 7 12a7 7 0 1 1-14 0c0-4 7-12 7-12z"/>`,
  lungs: `<path d="M12 7v10"/><path d="M12 10c-2-1-6-1-7 3-1 4 2 7 5 6"/><path d="M12 10c2-1 6-1 7 3 1 4-2 7-5 6"/>`,
  bandage: `<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-25 12 12)"/><path d="M10 11.5h.01M12 12h.01M14 12.5h.01"/>`,
  hospital: `<path d="M4 21V8l8-5 8 5v13"/><path d="M10 21v-6h4v6M12 10v4M10 12h4"/>`,
  bed: `<path d="M3 18v-5a3 3 0 0 1 3-3h13v8M3 15h18M3 21v-3M21 21v-3"/><circle cx="7" cy="10" r="2"/>`,
  ambulance: `<rect x="2" y="9" width="15" height="8" rx="1"/><path d="M17 12h3l1 3v2h-4"/><circle cx="7" cy="19" r="2"/><circle cx="16" cy="19" r="2"/><path d="M8 12h4M10 10v4"/>`,
  flask: `<path d="M10 3h4v6l5 9a2 2 0 0 1-1.7 3H6.7A2 2 0 0 1 5 18l5-9V3z"/><path d="M8.5 15h7"/>`,
  clipboard: `<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4h6v3H9zM8 11h8M8 15h6"/>`,
  mask: `<path d="M4 10c0-1 2-3 8-3s8 2 8 3v3c0 3-4 5-8 5s-8-2-8-5v-3z"/><path d="M4 12H2M20 12h2"/>`,
  virus: `<circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>`,
  dna: `<path d="M7 4c6 4 4 12 10 16M17 4c-6 4-4 12-10 16"/><path d="M8 8h8M8 12h8M8 16h8"/>`,
  eye: `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
  ear: `<path d="M16 6a5 5 0 1 0-2 9v3a3 3 0 0 1-3 3"/><path d="M14 10a2 2 0 1 0-2 3"/>`,
  brain: `<path d="M8 8a3 3 0 0 1 3-3 3 3 0 0 1 5 2 3 3 0 0 1 2 3c0 4-4 6-6 8-2-2-6-4-6-8a3 3 0 0 1 2-2z"/><path d="M12 7v12"/>`,
  baby: `<circle cx="12" cy="8" r="4"/><path d="M6 20c1-4 3-6 6-6s5 2 6 6"/>`,
  wheelchair: `<circle cx="8" cy="6" r="2"/><path d="M8 8v5h6l3 6"/><circle cx="8" cy="17" r="4"/><path d="M12 13 14 15"/>`,
  fridge: `<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M6 11h12M9 7v2M9 15v3"/>`,
  snowflake: `<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M4.5 16.5l3-1.8M16.5 7.5l3 1.8"/>`,
  "shield-plus": `<path d="M12 3 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6l-7-3z"/><path d="M12 10v6M9 13h6"/>`,
  warning: `<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/>`,
  "alert-octagon": `<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16h.01"/>`,
  biohazard: `<circle cx="12" cy="12" r="2"/><path d="M12 6c2.4-2.8 6.5-2.2 7.2 1.2M6.2 14.2C3.2 15.6 2.5 19.6 5 21M17.8 14.2c3 1.4 3.7 5.4 1.2 6.8"/><path d="M9.5 8.2 12 10M14.2 14.6 12 12.8M9.8 14.6 12 12.8"/>`,
  radiation: `<circle cx="12" cy="12" r="1.6"/><path d="M12 7.2c3.6 0 5.6-2.6 4-5.4M7.4 14.6C4.6 16.4 1.4 15 2.2 11.4M16.6 14.6c2.8 1.8 6 0.4 5.2-3.2"/>`,
  fire: `<path d="M12 3c2 4-2 5 0 8 3-2 6 1 6 5a6 6 0 1 1-12 0c0-4 4-7 6-13z"/>`,
  "no-entry": `<circle cx="12" cy="12" r="9"/><path d="M6 12h12"/>`,
  lightning: `<path d="M13 2 6 13h6l-1 9 7-11h-6l1-9z"/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8h.01"/>`,
  home: `<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>`,
  plug: `<path d="M9 2v6M15 2v6M12 14v8M7 8h10v4a5 5 0 0 1-10 0V8z"/>`,
  lamp: `<path d="M9 18h6M10 21h4"/><path d="M8 10a4 4 0 1 1 8 0c0 3-2 4-2 7H10c0-3-2-4-2-7z"/>`,
  water: `<path d="M4 14c0-2 2-3 4-2 2-3 6-3 8 0 2-1 4 0 4 2 0 4-4 7-8 7s-8-3-8-7z"/>`,
  box: `<path d="M3 7.5 12 3l9 4.5V17L12 21 3 17z"/><path d="M12 12 21 7.5M12 12v9M12 12 3 7.5"/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>`,
  person: `<circle cx="12" cy="8" r="3"/><path d="M5 20c1-4 3-6 7-6s6 2 7 6"/>`,
  phone: `<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 19h2"/>`,
  lock: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
  wifi: `<path d="M5 12a9 9 0 0 1 14 0M8 15a5 5 0 0 1 8 0"/><circle cx="12" cy="19" r="1"/>`,
  battery: `<rect x="3" y="8" width="16" height="8" rx="1"/><path d="M19 11h2v2h-2M6 10v4M9 10v4M12 10v4"/>`,
  recycle: `<path d="M7 19 4 13l4-1M17 19l3-6-4-1M8 6l4-2 2 4"/><path d="M8 12 4 13M16 12l4 1M14 8l-2-4"/>`,
  trash: `<path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13"/>`,
  "arrow-right": `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  "arrow-left": `<path d="M19 12H5M11 6l-6 6 6 6"/>`,
  "arrow-up": `<path d="M12 19V5M6 11l6-6 6 6"/>`,
  "arrow-down": `<path d="M12 5v14M6 13l6 6 6-6"/>`,
  check: `<path d="M5 13l5 5L20 7"/>`,
  "x-mark": `<path d="M6 6l12 12M18 6 6 18"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  star: `<path d="M12 3 14.8 9.2 21.5 10l-4.7 4.6L18 21l-6-3.2L6 21l1.2-6.4L2.5 10l6.7-.8z"/>`,
};

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  ${inner}\n</svg>\n`;

for (const [id, inner] of Object.entries(paths)) {
  writeFileSync(join(iconsDir, `${id}.svg`), wrap(inner));
}

console.log(`${Object.keys(paths).length} editor-iconen geschreven`);
