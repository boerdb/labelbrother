import { NextResponse } from "next/server";
import { getIconPack, iconsFromIconify } from "@/lib/iconPacks";

const ICONIFY = "https://api.iconify.design";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let packId = "";
  try {
    const body = (await req.json()) as { packId?: string };
    packId = body.packId?.trim() ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldig verzoek" }, { status: 400 });
  }

  const pack = getIconPack(packId);
  if (!pack || pack.builtin || !pack.prefix) {
    return NextResponse.json({ ok: false, error: "Onbekende set" }, { status: 400 });
  }

  const names = pack.icons.map((icon) => icon.name).join(",");
  const url = `${ICONIFY}/${encodeURIComponent(pack.prefix)}.json?icons=${encodeURIComponent(names)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BrotherDruk/1.0 (label editor)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      throw new Error(`Iconify antwoordde ${res.status}`);
    }
    const payload = (await res.json()) as {
      icons?: Record<string, { body: string }>;
      width?: number;
      height?: number;
    };
    const icons = iconsFromIconify(pack, payload);
    if (icons.length === 0) {
      throw new Error("Geen iconen in deze set gevonden");
    }
    return NextResponse.json({
      ok: true,
      packId: pack.id,
      icons,
      missing: pack.icons.length - icons.length,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Download mislukt",
      },
      { status: 502 },
    );
  }
}
