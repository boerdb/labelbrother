import type { EditorElement } from "@/lib/editorTypes";
import { getIconSrc } from "@/lib/icons";

interface LabelPreviewProps {
  elements: EditorElement[];
  width: number;
  height: number;
}

/** Lichtgewicht SVG-weergave van een label, voor sjabloonkaarten. */
export function LabelPreview({ elements, width, height }: LabelPreviewProps) {
  return (
    <svg
      className="label-preview"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect width={width} height={height} fill="#fff" />
      {elements.map((el) => {
        if (el.type === "rect") {
          return (
            <rect
              key={el.id}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              rx={el.cornerRadius ?? 0}
              fill={el.fill ?? "none"}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
            />
          );
        }
        if (el.type === "line") {
          return (
            <polyline
              key={el.id}
              points={el.points.join(" ")}
              fill="none"
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
              strokeDasharray={el.dashed ? `${el.strokeWidth * 3} ${el.strokeWidth * 2}` : undefined}
            />
          );
        }
        if (el.type === "icon") {
          const src = el.src ?? getIconSrc(el.iconId);
          if (!src) return null;
          return (
            <image
              key={el.id}
              href={src}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
            />
          );
        }
        const anchor = el.align === "left" ? "start" : el.align === "right" ? "end" : "middle";
        const tx = el.align === "left" ? el.x : el.align === "right" ? el.x + el.width : el.x + el.width / 2;
        return (
          <text
            key={el.id}
            x={tx}
            y={el.y}
            fontSize={el.fontSize}
            fontWeight={el.fontStyle === "bold" ? 700 : 400}
            fontFamily="Arial, Helvetica, sans-serif"
            textAnchor={anchor}
            dominantBaseline="hanging"
            fill={el.fill}
          >
            {el.text.split("\n").map((line, i) => (
              <tspan key={i} x={tx} dy={i === 0 ? 0 : el.fontSize * 1.1}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
