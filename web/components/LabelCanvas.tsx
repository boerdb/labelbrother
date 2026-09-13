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

const MIN_BOX = 24;
const MIN_FONT = 8;

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
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);
  return image;
}

const IconNode = forwardRef<
  Konva.Image,
  {
    element: Extract<EditorElement, { type: "icon" }>;
    isSelected: boolean;
    onSelect: () => void;
    onDragEnd: (x: number, y: number) => void;
    onTransformEnd: (patch: { x: number; y: number; width: number; height: number }) => void;
  }
>(function IconNode({ element, isSelected, onSelect, onDragEnd, onTransformEnd }, ref) {
  const image = useIconImage(getIconSrc(element.iconId));
  return (
    <KonvaImage
      ref={ref}
      image={image ?? undefined}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => {
        const { scaleX, scaleY, x, y } = bakeScale(e.target);
        onTransformEnd({
          x,
          y,
          width: Math.max(MIN_BOX, Math.round(element.width * scaleX)),
          height: Math.max(MIN_BOX, Math.round(element.height * scaleY)),
        });
      }}
      stroke={isSelected ? "#1a5fb4" : undefined}
      strokeWidth={isSelected ? 2 : 0}
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

  useImperativeHandle(ref, () => ({
    async exportPng() {
      const stage = stageRef.current;
      if (!stage) {
        throw new Error("Canvas niet klaar");
      }
      transformerRef.current?.nodes([]);
      stage.draw();
      return stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
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

  const scale = zoom / 100;
  const keepRatio =
    selectedElement?.type === "icon" || selectedElement?.type === "text";
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
        width={spec.width * scale + 24}
        height={spec.height * scale + 24}
        scaleX={scale}
        scaleY={scale}
        x={12}
        y={12}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            onSelect(null);
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) {
            onSelect(null);
          }
        }}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={spec.width}
            height={spec.height}
            fill="#ffffff"
            listening={false}
          />
          {elements
            .filter((el) => el.type !== "text")
            .map((el) => {
            const isSelected = el.id === selectedId;
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
                  draggable
                  onClick={() => onSelect(el.id)}
                  onTap={() => onSelect(el.id)}
                  onDragEnd={(e) =>
                    onChangeElement(el.id, { x: e.target.x(), y: e.target.y() })
                  }
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
                  draggable
                  onClick={() => onSelect(el.id)}
                  onTap={() => onSelect(el.id)}
                  onDragEnd={(e) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    onChangeElement(el.id, {
                      points: el.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)),
                      x: el.x + dx,
                      y: el.y + dy,
                    });
                    e.target.position({ x: 0, y: 0 });
                  }}
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
            return (
              <IconNode
                key={el.id}
                ref={isSelected ? attachSelected : undefined}
                element={el}
                isSelected={isSelected}
                onSelect={() => onSelect(el.id)}
                onDragEnd={(x, y) => onChangeElement(el.id, { x, y })}
                onTransformEnd={(patch) => onChangeElement(el.id, patch)}
              />
            );
          })}
          {elements
            .filter((el) => el.type === "text")
            .map((el) => {
              const isSelected = el.id === selectedId;
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
                  fill={el.fill}
                  align={el.align}
                  stroke={isSelected ? "#1a5fb4" : undefined}
                  strokeWidth={isSelected ? 1 : 0}
                  draggable
                  onClick={() => onSelect(el.id)}
                  onTap={() => onSelect(el.id)}
                  onDblClick={() => onRequestTextEdit?.(el.id)}
                  onDblTap={() => onRequestTextEdit?.(el.id)}
                  onDragEnd={(e) =>
                    onChangeElement(el.id, { x: e.target.x(), y: e.target.y() })
                  }
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
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={keepRatio}
            enabledAnchors={enabledAnchors}
            anchorSize={10}
            borderStroke="#1a5fb4"
            anchorStroke="#1a5fb4"
            anchorFill="#ffffff"
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < MIN_BOX || Math.abs(newBox.height) < MIN_BOX) {
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
