"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ICON_PACKS, getIconPack } from "@/lib/iconPacks";
import {
  ICON_CATEGORY_LABELS,
  ICON_LIBRARY,
  getExtraIcons,
  registerExtraIcons,
  unregisterPackIcons,
  type IconCategory,
  type IconDef,
} from "@/lib/icons";
import {
  ICON_PACK_FORMAT,
  deleteIconPack,
  listSavedIconPacks,
  saveIconPack,
} from "@/lib/storage";

type Notify = (kind: "info" | "success" | "error", message: string) => void;
type CategoryFilter = "all" | IconCategory;

interface IconsPanelProps {
  onAdd: (icon: IconDef) => void;
  notify: Notify;
}

async function fetchPack(packId: string): Promise<IconDef[]> {
  const res = await fetch("/api/icons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    icons?: IconDef[];
  };
  if (!res.ok || !data.ok || !data.icons?.length) {
    throw new Error(data.error ?? "Download mislukt");
  }
  return data.icons;
}

export default function IconsPanel({ onAdd, notify }: IconsPanelProps) {
  const [view, setView] = useState<"browse" | "sets">("browse");
  const [installed, setInstalled] = useState<string[]>([]);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const install = useCallback(
    async (packId: string, { silent = false } = {}) => {
      setBusyPack(packId);
      try {
        const icons = await fetchPack(packId);
        unregisterPackIcons(packId);
        registerExtraIcons(icons);
        await saveIconPack({ id: packId, icons, updatedAt: Date.now(), format: ICON_PACK_FORMAT });
        setInstalled((prev) => [...new Set([...prev, packId])]);
        setRevision((n) => n + 1);
        if (!silent) {
          notify("success", `${getIconPack(packId)?.name ?? "Set"} toegevoegd (${icons.length} icons)`);
        }
      } catch (e) {
        if (!silent) notify("error", e instanceof Error ? e.message : "Download mislukt");
      } finally {
        setBusyPack(null);
      }
    },
    [notify],
  );

  useEffect(() => {
    void listSavedIconPacks().then(async (packs) => {
      for (const pack of packs) registerExtraIcons(pack.icons);
      setInstalled(packs.map((pack) => pack.id));
      setRevision((n) => n + 1);
      // Oudere downloads hadden verkeerd opgemaakte afbeeldingen: stil vernieuwen.
      for (const pack of packs) {
        if (pack.format !== ICON_PACK_FORMAT && getIconPack(pack.id)) {
          await install(pack.id, { silent: true });
        }
      }
    });
  }, [install]);

  const remove = async (packId: string) => {
    unregisterPackIcons(packId);
    await deleteIconPack(packId);
    setInstalled((prev) => prev.filter((id) => id !== packId));
    setRevision((n) => n + 1);
    if (scope === packId) setScope("all");
    notify("info", `${getIconPack(packId)?.name ?? "Set"} verwijderd van dit apparaat`);
  };

  const availablePacks = useMemo(
    () => ICON_PACKS.filter((pack) => pack.builtin || installed.includes(pack.id)),
    [installed],
  );

  const scopedIcons = useMemo(() => {
    void revision;
    if (scope === "builtin") return ICON_LIBRARY;
    if (scope !== "all") return getExtraIcons(scope);
    return [...ICON_LIBRARY, ...availablePacks.filter((p) => !p.builtin).flatMap((p) => getExtraIcons(p.id))];
  }, [scope, availablePacks, revision]);

  const categories = useMemo(() => {
    const present = new Set(scopedIcons.map((icon) => icon.category));
    return (Object.keys(ICON_CATEGORY_LABELS) as CategoryFilter[]).filter(
      (key) => key === "all" || present.has(key as IconCategory),
    );
  }, [scopedIcons]);

  useEffect(() => {
    if (!categories.includes(category)) setCategory("all");
  }, [categories, category]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedIcons.filter((icon) => {
      if (category !== "all" && icon.category !== category) return false;
      if (!q) return true;
      return icon.label.toLowerCase().includes(q) || icon.id.toLowerCase().includes(q);
    });
  }, [scopedIcons, category, query]);

  const notInstalledCount = ICON_PACKS.filter((p) => !p.builtin && !installed.includes(p.id)).length;

  if (view === "sets") {
    return (
      <div className="panel-body">
        <div className="panel-head">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView("browse")}>
            <Icon name="chevronDown" size={16} style={{ transform: "rotate(90deg)" }} />
            Terug
          </button>
          <h2>Icon-sets</h2>
        </div>
        <p className="hint">
          Sets worden één keer gedownload en daarna op dit apparaat bewaard, ook offline.
        </p>
        <ul className="pack-list">
          {ICON_PACKS.map((pack) => {
            const ready = pack.builtin || installed.includes(pack.id);
            const busy = busyPack === pack.id;
            const count = pack.builtin ? ICON_LIBRARY.length : pack.icons.length;
            return (
              <li key={pack.id} className={`pack-card${ready ? " is-ready" : ""}`}>
                <div className="pack-info">
                  <strong>{pack.name}</strong>
                  <span>{pack.description}</span>
                  <small>
                    {count} icons{pack.builtin ? "" : ` · ${pack.license}`}
                  </small>
                </div>
                <div className="pack-actions">
                  {pack.builtin ? (
                    <span className="badge">Ingebouwd</span>
                  ) : ready ? (
                    <>
                      <span className="badge badge-success">
                        <Icon name="check" size={13} /> Op apparaat
                      </span>
                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        title="Opnieuw downloaden"
                        aria-label={`${pack.name} opnieuw downloaden`}
                        disabled={busy}
                        onClick={() => void install(pack.id)}
                      >
                        <Icon name="refresh" size={15} className={busy ? "spin" : undefined} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-icon btn-sm btn-danger-ghost"
                        title="Verwijderen"
                        aria-label={`${pack.name} verwijderen`}
                        disabled={busy}
                        onClick={() => void remove(pack.id)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyPack !== null}
                      onClick={() => void install(pack.id)}
                    >
                      <Icon name={busy ? "refresh" : "download"} size={15} className={busy ? "spin" : undefined} />
                      {busy ? "Bezig…" : "Downloaden"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <div className="search-field">
        <Icon name="search" size={16} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek icon, bijv. huis, pijl…"
          aria-label="Icons zoeken"
        />
      </div>

      <div className="icon-filters">
        <select
          className="select"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          aria-label="Icon-set"
        >
          <option value="all">Alle sets ({availablePacks.length})</option>
          {availablePacks.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-sm" onClick={() => setView("sets")}>
          <Icon name="package" size={15} />
          Sets beheren
        </button>
      </div>

      {categories.length > 2 && (
        <div className="chip-row" role="tablist" aria-label="Categorie">
          {categories.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              className={`chip${category === id ? " active" : ""}`}
              onClick={() => setCategory(id)}
            >
              {ICON_CATEGORY_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" size={22} />
          <p>Geen icons gevonden{query ? ` voor “${query}”` : ""}.</p>
          {notInstalledCount > 0 && (
            <button type="button" className="btn btn-sm" onClick={() => setView("sets")}>
              Meer sets downloaden
            </button>
          )}
        </div>
      ) : (
        <div className="icon-grid">
          {visible.map((icon) => (
            <button
              key={icon.id}
              type="button"
              className="icon-btn"
              title={`${icon.label} toevoegen`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-brotherdruk-icon", icon.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAdd(icon)}
            >
              <span className="icon-thumb">
                <img src={icon.src} alt="" loading="lazy" />
              </span>
              <span className="icon-label">{icon.label}</span>
            </button>
          ))}
        </div>
      )}

      <p className="hint hint-footer">
        Klik om toe te voegen of sleep naar het label.
        {notInstalledCount > 0 && (
          <>
            {" "}
            <button type="button" className="link-btn" onClick={() => setView("sets")}>
              {notInstalledCount} sets beschikbaar om te downloaden
            </button>
          </>
        )}
      </p>
    </div>
  );
}
