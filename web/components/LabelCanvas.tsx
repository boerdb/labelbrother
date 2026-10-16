"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Text, Rect, Line, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import type { EditorElement } from "@/lib/editorTypes";
import { getIconSrc } from "@/lib/icons";
import { LABEL_SIZES, type LabelSizeId } from "@/lib/labelSizes";

export interface LabelCanvasHandle {
  exportPng: () => Promise<string>;
}

interface LabelCanvasProps {
  labelSizeId: LabelSizeId;
  elements: EditorElement[];
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  onRequestTextEdit?: (id: string) => void;
}

/** Ruimte rond het label voor de schaduw en de resize-handles. */
export const CANVAS_PADDING = 16;
const MIN_BOX = 24;
const MIN_FONT = 8;
const SNAP_PX = 10;
const ACCENT = "#2563eb";
const GUIDE = "#ec4899";

function bakeScale(node: Konva.Node) {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);
  return { scaleX, scaleY, x: node.x(), y: node.y() };
}

function useIconImage(src: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  return image;
}

interface DragHandlers {
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

const IconNode = forwardRef<
  Konva.Image,
  {
    element: Extract<EditorElement, { type: "icon" }>;
    onSelect: () => void;
    drag: DragHandlers;
    onTransformEnd: (patch: { x: number; y: number; width: number; height: number }) => void;
  }
>(function IconNode({ element, onSelect, drag, onTransformEnd }, ref) {
  const image = useIconImage(element.src ?? getIconSrc(element.iconId));
  return (
    <KonvaImage
      ref={ref}
      image={image ?? undefined}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      draggable
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      onDragMove={drag.onDragMove}
      onDragEnd={drag.onDragEnd}
      onTransformEnd={(e) => {
        const { scaleX, scaleY, x, y } = bakeScale(e.target);
        onTransformEnd({
          x,
          y,
          width: Math.max(MIN_BOX, Math.round(element.width * scaleX)),
          height: Math.max(MIN_BOX, Math.round(element.height * scaleY)),
        });
      }}
    />
  );
});

const LabelCanvas = forwardRef<LabelCanvasHandle, LabelCanvasProps>(function LabelCanvas(
  { labelSizeId, elements, selectedId, zoom, onSelect, onChangeElement, onRequestTextEdit },
  ref,
) {
  const spec = LABEL_SIZES[labelSizeId];
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedRef = useRef<Konva.Node>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });

  const scale = zoom / 100;
  const pad = CANVAS_PADDING / scale;

  useImperativeHandle(ref, () => ({
    async exportPng() {
      const stage = stageRef.current;
      const tr = transformerRef.current;
      if (!stage) {
        throw new Error("Canvas niet klaar");
      }
      const attached = tr?.nodes() ?? [];
      const bg = stage.findOne<Konva.Rect>(".label-bg");
      const view = { scale: stage.scaleX(), x: stage.x(), y: stage.y() };
      tr?.nodes([]);
      setGuides({ v: false, h: false });
      // Exact het label op printresolutie (1 canvas-eenheid = 1 printerdot), los van
      // de schermzoom, en zonder schaduw/ronde hoeken zodat elke pixel wit of zwart is.
      bg?.cornerRadius(0).shadowEnabled(false);
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      try {
        return stage.toDataURL({
          x: 0,
          y: 0,
          width: spec.width,
          height: spec.height,
          pixelRatio: 1,
          mimeType: "image/png",
        });
      } finally {
        stage.scale({ x: view.scale, y: view.scale });
        stage.position({ x: view.x, y: view.y });
        bg?.cornerRadius(6 / view.scale).shadowEnabled(true);
        tr?.nodes(attached);
        stage.batchDraw();
      }
    },
  }));

  const selectedElement = elements.find((el) => el.id === selectedId);
  const attachSelected = (node: Konva.Node | null) => {
    selectedRef.current = node;
  };

  useEffect(() => {
    const tr = transformerRef.current;
    const node = selectedRef.current;
    if (!tr) return;
    if (node && selectedElement) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements, selectedElement]);

  const dragHandlers = (el: EditorElement): DragHandlers => ({
    onDragMove: (e) => {
      const node = e.target;
      const layer = node.getLayer();
      if (!layer) return;
      const box = node.getClientRect({ relativeTo: layer, skipShadow: true });
      const threshold = SNAP_PX / scale;
      const dx = spec.width / 2 - (box.x + box.width / 2);
      const dy = spec.height / 2 - (box.y + box.height / 2);
      const v = Math.abs(dx) < threshold;
      const h = Math.abs(dy) < threshold;
      if (v) node.x(node.x() + dx);
      if (h) node.y(node.y() + dy);
      setGuides((g) => (g.v === v && g.h === h ? g : { v, h }));
    },
    onDragEnd: (e) => {
      setGuides({ v: false, h: false });
      const node = e.target;
      if (el.type === "line") {
        const dx = node.x();
        const dy = node.y();
        node.position({ x: 0, y: 0 });
        onChangeElement(el.id, {
          points: el.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)),
          x: 0,
          y: 0,
        });
        return;
      }
      onChangeElement(el.id, { x: node.x(), y: node.y() });
    },
  });

  const keepRatio = selectedElement?.type === "icon" || selectedElement?.type === "text";
  const enabledAnchors =
    selectedElement?.type === "line"
      ? ["middle-left", "middle-right"]
      : keepRatio
        ? ["top-left", "top-right", "bottom-left", "bottom-right"]
        : undefined;

  return (
    <div className="canvas-frame">
      <Stage
        ref={stageRef}
        width={spec.width * scale + CANVAS_PADDING * 2}
        height={spec.height * scale + CANVAS_PADDING * 2}
        scaleX={scale}
        scaleY={scale}
        x={CANVAS_PADDING}
        y={CANVAS_PADDING}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage() || e.target.name() === "label-bg") {
            onSelect(null);
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage() || e.target.name() === "label-bg") {
            onSelect(null);
          }
        }}
      >
        <Layer>
          <Rect
            name="label-bg"
            x={0}
            y={0}
            width={spec.width}
            height={spec.height}
            fill="#ffffff"
            cornerRadius={6 / scale}
            shadowColor="#0f172a"
            shadowOpacity={0.18}
            shadowBlur={pad * 0.9}
            shadowOffsetY={pad * 0.15}
          />
          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            const select = () => onSelect(el.id);
            const drag = dragHandlers(el);
            if (el.type === "rect") {
              return (
                <Rect
                  key={el.id}
                  ref={isSelected ? attachSelected : undefined}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  fill={el.fill ?? "transparent"}
                  cornerRadius={el.cornerRadius ?? 0}
                  strokeScaleEnabled={false}
                  draggable
                  onMouseDown={select}
                  onTouchStart={select}
                  {...drag}
                  onTransformEnd={(e) => {
                    const { scaleX, scaleY, x, y } = bakeScale(e.target);
                    onChangeElement(el.id, {
                      x,
                      y,
                      width: Math.max(MIN_BOX, Math.round(el.width * scaleX)),
                      height: Math.max(MIN_BOX, Math.round(el.height * scaleY)),
                    });
                  }}
                />
              );
            }
            if (el.type === "line") {
              return (
                <Line
                  key={el.id}
                  ref={isSelected ? attachSelected : undefined}
                  points={el.points}
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  hitStrokeWidth={Math.max(24, el.strokeWidth * 3)}
                  dash={el.dashed ? [el.strokeWidth * 3, el.strokeWidth * 2] : undefined}
                  strokeScaleEnabled={false}
                  draggable
                  onMouseDown={select}
                  onTouchStart={select}
                  {...drag}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const { scaleX, scaleY, x, y } = bakeScale(node);
                    node.position({ x: 0, y: 0 });
                    onChangeElement(el.id, {
                      points: el.points.map((p, i) =>
                        i % 2 === 0 ? p * scaleX + x : p * scaleY + y,
                      ),
                      x: 0,
                      y: 0,
                    });
                  }}
                />
              );
            }
            if (el.type === "icon") {
              return (
                <IconNode
                  key={el.id}
                  ref={isSelected ? attachSelected : undefined}
                  element={el}
                  onSelect={select}
                  drag={drag}
                  onTransformEnd={(patch) => onChangeElement(el.id, patch)}
                />
              );
            }
            return (
              <Text
                key={el.id}
                ref={isSelected ? attachSelected : undefined}
                x={el.x}
                y={el.y}
                width={el.width}
                text={el.text}
                fontSize={el.fontSize}
                fontStyle={el.fontStyle}
                fontFamily="Arial, Helvetica, sans-serif"
                lineHeight={1.1}
                fill={el.fill}
                align={el.align}
                draggable
                onMouseDown={select}
                onTouchStart={select}
                onDblClick={() => onRequestTextEdit?.(el.id)}
                onDblTap={() => onRequestTextEdit?.(el.id)}
                {...drag}
                onTransformEnd={(e) => {
                  const { scaleX, scaleY, x, y } = bakeScale(e.target);
                  const factor = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
                  onChangeElement(el.id, {
                    x,
                    y,
                    width: Math.max(40, Math.round(el.width * scaleX)),
                    fontSize: Math.max(MIN_FONT, Math.round(el.fontSize * factor)),
                  });
                }}
              />
            );
          })}
          {guides.v && (
            <Line
              points={[spec.width / 2, 0, spec.width / 2, spec.height]}
              stroke={GUIDE}
              strokeWidth={1}
              strokeScaleEnabled={false}
              dash={[6 / scale, 4 / scale]}
              listening={false}
            />
          )}
          {guides.h && (
            <Line
              points={[0, spec.height / 2, spec.width, spec.height / 2]}
              stroke={GUIDE}
              strokeWidth={1}
              strokeScaleEnabled={false}
              dash={[6 / scale, 4 / scale]}
              listening={false}
            />
          )}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={keepRatio}
            enabledAnchors={enabledAnchors}
            anchorSize={10}
            anchorCornerRadius={3}
            padding={4}
            borderStroke={ACCENT}
            anchorStroke={ACCENT}
            anchorFill="#ffffff"
            ignoreStroke
            boundBoxFunc={(oldBox, newBox) => {
              const min = MIN_BOX * scale;
              const tooNarrow = Math.abs(newBox.width) < min;
              // Een lijn heeft geen hoogte; alleen de lengte begrenzen.
              const tooLow = selectedElement?.type !== "line" && Math.abs(newBox.height) < min;
              if (tooNarrow || tooLow) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
});

export default LabelCanvas;
