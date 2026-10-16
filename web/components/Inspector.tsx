"use client";

import { useEffect, useState, type RefObject } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { EditorElement, TextElement } from "@/lib/editorTypes";
import { getAllIcons } from "@/lib/icons";
import { DOTS_PER_MM, type LabelSizeSpec } from "@/lib/labelSizes";

interface InspectorProps {
  spec: LabelSizeSpec;
  elements: EditorElement[];
  selected: EditorElement | null;
  textRef: RefObject<HTMLTextAreaElement | null>;
  onSelect: (id: string | null) => void;
  /** Wijziging met undo-stap. */
  onCommit: (id: string, patch: Partial<EditorElement>) => void;
  /** Live wijziging (tijdens typen/schuiven), na `onBeginEdit`. */
  onLive: (id: string, patch: Partial<EditorElement>) => void;
  onBeginEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (direction: "front" | "back") => void;
  onCenter: (axis: "h" | "v") => void;
}

const TYPE_META: Record<EditorElement["type"], { label: string; icon: IconName }> = {
  text: { label: "Tekst", icon: "text" },
  rect: { label: "Rechthoek", icon: "square" },
  line: { label: "Lijn", icon: "minus" },
  icon: { label: "Icon", icon: "smile" },
};

export function elementTitle(el: EditorElement): string {
  if (el.type === "text") return el.text.split("\n")[0]?.trim() || "Lege tekst";
  if (el.type === "icon") {
    return getAllIcons().find((i) => i.id === el.iconId)?.label ?? "Icon";
  }
  return TYPE_META[el.type].label;
}

const toMm = (dots: number) => Math.round((dots / DOTS_PER_MM) * 10) / 10;
const toDots = (mm: number) => Math.round(mm * DOTS_PER_MM);

function boundsOf(el: EditorElement) {
  if (el.type === "line") {
    const xs = el.points.filter((_, i) => i % 2 === 0);
    const ys = el.points.filter((_, i) => i % 2 === 1);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }
  if (el.type === "text") return { x: el.x, y: el.y, width: el.width, height: 0 };
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

function MmField({
  label,
  value,
  onCommit,
  min = 0,
}: {
  label: string;
  value: number;
  onCommit: (mm: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(toMm(value)));
  useEffect(() => setDraft(String(toMm(value))), [value]);
  const commit = () => {
    const mm = parseFloat(draft.replace(",", "."));
    if (Number.isFinite(mm) && mm >= min) onCommit(mm);
    else setDraft(String(toMm(value)));
  };
  return (
    <label className="mm-field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <em>mm</em>
    </label>
  );
}

function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.label}
          className={value === o.value ? "active" : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={16} /> : null}
          {o.icon ? <span className="sr-only">{o.label}</span> : o.label}
        </button>
      ))}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onBegin,
  onLive,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onBegin: () => void;
  onLive: (v: number) => void;
}) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        <output>
          {Math.round(value)}
          {unit}
        </output>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onBegin}
        onKeyDown={onBegin}
        onChange={(e) => onLive(Number(e.target.value))}
      />
    </div>
  );
}

export default function Inspector(props: InspectorProps) {
  const { spec, elements, selected, onSelect, onCommit, onLive, onBeginEdit } = props;

  if (!selected) {
    return (
      <div className="panel-body">
        <div className="label-info">
          <div>
            <span className="eyebrow">Label</span>
            <strong>{spec.name}</strong>
          </div>
          <span className="badge">DK-22205</span>
        </div>
        <section className="panel-group">
          <h3>
            <Icon name="layers" size={15} /> Lagen
          </h3>
          {elements.length === 0 ? (
            <p className="hint">
              Het label is nog leeg. Voeg tekst, een vorm of een icon toe, of begin met een sjabloon.
            </p>
          ) : (
            <ul className="layer-list">
              {[...elements].reverse().map((el) => (
                <li key={el.id}>
                  <button type="button" onClick={() => onSelect(el.id)}>
                    <Icon name={TYPE_META[el.type].icon} size={15} />
                    <span>{elementTitle(el)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel-group">
          <h3>Sneltoetsen</h3>
          <dl className="shortcuts">
            <dt>Ctrl Z / Ctrl Y</dt>
            <dd>Ongedaan / opnieuw</dd>
            <dt>Ctrl D</dt>
            <dd>Dupliceren</dd>
            <dt>Delete</dt>
            <dd>Verwijderen</dd>
            <dt>Pijltjes</dt>
            <dd>Verschuiven (Shift = grotere stap)</dd>
            <dt>Esc</dt>
            <dd>Selectie opheffen</dd>
          </dl>
        </section>
      </div>
    );
  }

  const meta = TYPE_META[selected.type];
  const b = boundsOf(selected);

  const moveTo = (axis: "x" | "y", mm: number) => {
    const target = toDots(mm);
    if (selected.type === "line") {
      const delta = target - (axis === "x" ? b.x : b.y);
      onCommit(selected.id, {
        points: selected.points.map((p, i) => p + ((i % 2 === 0) === (axis === "x") ? delta : 0)),
      });
      return;
    }
    onCommit(selected.id, { [axis]: target });
  };

  return (
    <div className="panel-body">
      <div className="inspector-head">
        <span className="type-badge">
          <Icon name={meta.icon} size={16} />
        </span>
        <div className="inspector-title">
          <span className="eyebrow">{meta.label}</span>
          <strong>{elementTitle(selected)}</strong>
        </div>
        <button type="button" className="btn btn-icon btn-ghost" title="Selectie opheffen" aria-label="Selectie opheffen" onClick={() => onSelect(null)}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {selected.type === "text" && <TextFields {...props} el={selected} />}

      {selected.type === "rect" && (
        <section className="panel-group">
          <h3>Opmaak</h3>
          <RangeField
            label="Lijndikte"
            value={selected.strokeWidth}
            min={0}
            max={24}
            unit=" px"
            onBegin={onBeginEdit}
            onLive={(v) => onLive(selected.id, { strokeWidth: v })}
          />
          <div className="field">
            <span className="field-label">Vulling</span>
            <Segmented
              label="Vulling"
              value={selected.fill === "#000000"}
              options={[
                { value: false, label: "Geen" },
                { value: true, label: "Zwart" },
              ]}
              onChange={(filled) => onCommit(selected.id, { fill: filled ? "#000000" : undefined })}
            />
          </div>
          <div className="field">
            <span className="field-label">Hoeken</span>
            <Segmented
              label="Hoeken"
              value={(selected.cornerRadius ?? 0) > 0}
              options={[
                { value: false, label: "Recht" },
                { value: true, label: "Afgerond" },
              ]}
              onChange={(round) => onCommit(selected.id, { cornerRadius: round ? 24 : 0 })}
            />
          </div>
        </section>
      )}

      {selected.type === "line" && (
        <section className="panel-group">
          <h3>Opmaak</h3>
          <RangeField
            label="Lijndikte"
            value={selected.strokeWidth}
            min={1}
            max={24}
            unit=" px"
            onBegin={onBeginEdit}
            onLive={(v) => onLive(selected.id, { strokeWidth: v })}
          />
          <div className="field">
            <span className="field-label">Stijl</span>
            <Segmented
              label="Lijnstijl"
              value={Boolean(selected.dashed)}
              options={[
                { value: false, label: "Doorgetrokken" },
                { value: true, label: "Gestippeld" },
              ]}
              onChange={(dashed) => onCommit(selected.id, { dashed })}
            />
          </div>
        </section>
      )}

      {selected.type === "icon" && (
        <section className="panel-group">
          <h3>Opmaak</h3>
          <RangeField
            label="Grootte"
            value={toMm(selected.width)}
            min={3}
            max={60}
            step={0.5}
            unit=" mm"
            onBegin={onBeginEdit}
            onLive={(mm) => {
              const size = toDots(mm);
              const cx = selected.x + selected.width / 2;
              const cy = selected.y + selected.height / 2;
              onLive(selected.id, { width: size, height: size, x: cx - size / 2, y: cy - size / 2 });
            }}
          />
        </section>
      )}

      <section className="panel-group">
        <h3>Positie &amp; maat</h3>
        <div className="mm-grid">
          <MmField label="X" value={b.x} onCommit={(mm) => moveTo("x", mm)} min={-100} />
          <MmField label="Y" value={b.y} onCommit={(mm) => moveTo("y", mm)} min={-100} />
          {selected.type !== "line" && (
            <MmField
              label="B"
              value={b.width}
              min={1}
              onCommit={(mm) =>
                onCommit(
                  selected.id,
                  selected.type === "icon"
                    ? { width: toDots(mm), height: toDots(mm) }
                    : { width: toDots(mm) },
                )
              }
            />
          )}
          {selected.type === "rect" && (
            <MmField label="H" value={b.height} min={1} onCommit={(mm) => onCommit(selected.id, { height: toDots(mm) })} />
          )}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-sm" onClick={() => props.onCenter("h")}>
            <Icon name="centerH" size={15} /> Horizontaal centreren
          </button>
          <button type="button" className="btn btn-sm" onClick={() => props.onCenter("v")}>
            <Icon name="centerV" size={15} /> Verticaal centreren
          </button>
        </div>
      </section>

      <section className="panel-group">
        <h3>Volgorde</h3>
        <div className="btn-row">
          <button type="button" className="btn btn-sm" onClick={() => props.onReorder("front")}>
            <Icon name="bringFront" size={15} /> Naar voren
          </button>
          <button type="button" className="btn btn-sm" onClick={() => props.onReorder("back")}>
            <Icon name="sendBack" size={15} /> Naar achteren
          </button>
        </div>
      </section>

      <div className="inspector-footer">
        <button type="button" className="btn" onClick={props.onDuplicate}>
          <Icon name="copy" size={16} /> Dupliceren
        </button>
        <button type="button" className="btn btn-danger" onClick={props.onDelete}>
          <Icon name="trash" size={16} /> Verwijderen
        </button>
      </div>
    </div>
  );
}

function TextFields({
  el,
  textRef,
  onCommit,
  onLive,
  onBeginEdit,
}: InspectorProps & { el: TextElement }) {
  return (
    <section className="panel-group">
      <h3>Tekst</h3>
      <div className="field">
        <textarea
          ref={textRef}
          className="input"
          rows={3}
          value={el.text}
          aria-label="Tekst"
          onFocus={onBeginEdit}
          onChange={(e) => onLive(el.id, { text: e.target.value })}
        />
      </div>
      <RangeField
        label="Lettergrootte"
        value={el.fontSize}
        min={12}
        max={240}
        step={2}
        unit=" px"
        onBegin={onBeginEdit}
        onLive={(v) => onLive(el.id, { fontSize: v })}
      />
      <div className="field-row">
        <Segmented
          label="Gewicht"
          value={el.fontStyle}
          options={[
            { value: "normal", label: "Normaal" },
            { value: "bold", label: "Vet" },
          ]}
          onChange={(fontStyle) => onCommit(el.id, { fontStyle })}
        />
        <Segmented
          label="Uitlijning"
          value={el.align}
          options={[
            { value: "left", label: "Links", icon: "alignLeft" },
            { value: "center", label: "Midden", icon: "alignCenter" },
            { value: "right", label: "Rechts", icon: "alignRight" },
          ]}
          onChange={(align) => onCommit(el.id, { align })}
        />
      </div>
    </section>
  );
}
