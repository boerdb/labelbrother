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

function IconNode({
  element,
  isSelected,
  onSelect,
  onDragEnd,
}: {
  element: Extract<EditorElement, { type: "icon" }>;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const image = useIconImage(getIconSrc(element.iconId));
  return (
    <KonvaImage
      image={image ?? undefined}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      stroke={isSelected ? "#1a5fb4" : undefined}
      strokeWidth={isSelected ? 2 : 0}
    />
  );
}

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

  useEffect(() => {
    const tr = transformerRef.current;
    const node = selectedRef.current;
    if (!tr) return;
    const useTransformer =
      node &&
      selectedElement &&
      selectedElement.type !== "text";
    if (useTransformer) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements, selectedElement]);

  const scale = zoom / 100;

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
                  ref={
                    isSelected
                      ? (node) => {
                          selectedRef.current = node;
                        }
                      : undefined
                  }
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
                />
              );
            }
            if (el.type === "line") {
              return (
                <Line
                  key={el.id}
                  ref={
                    isSelected
                      ? (node) => {
                          selectedRef.current = node;
                        }
                      : undefined
                  }
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
                />
              );
            }
            return (
              <IconNode
                key={el.id}
                element={el}
                isSelected={isSelected}
                onSelect={() => onSelect(el.id)}
                onDragEnd={(x, y) => onChangeElement(el.id, { x, y })}
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
                />
              );
            })}
          <Transformer ref={transformerRef} rotateEnabled={false} />
        </Layer>
      </Stage>
    </div>
  );
});

export default LabelCanvas;
