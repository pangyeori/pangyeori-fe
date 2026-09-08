"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  source: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (file: File) => void;
  onEdit: () => void;
};
type Crop = { x: number; y: number; size: number };
type Corner = "nw" | "ne" | "sw" | "se";
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const corners: { id: Corner; label: string; style: string }[] = [
  {
    id: "nw",
    label: "왼쪽 위",
    style: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  },
  {
    id: "ne",
    label: "오른쪽 위",
    style: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  },
  {
    id: "sw",
    label: "왼쪽 아래",
    style:
      "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  },
  {
    id: "se",
    label: "오른쪽 아래",
    style:
      "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  },
];
function Icon({ name }: { name: "rotate" | "flip" | "check" | "close" }) {
  const paths = {
    rotate: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
    flip: "M12 3v18M3 17l5-10v10H3ZM21 17 16 7v10h5Z",
    check: "M5 12l4 4L19 6",
    close: "M6 6l12 12M18 6L6 18",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function dimensions(image: HTMLImageElement | null, rotation: number) {
  if (!image) return { width: 1, height: 1 };
  const scale = Math.min(
    1,
    2048 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const w = Math.round(image.naturalWidth * scale),
    h = Math.round(image.naturalHeight * scale);
  return rotation % 180 ? { width: h, height: w } : { width: w, height: h };
}
function initialCrop(width: number, height: number): Crop {
  const size = Math.min(width, height) * 0.8;
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

export function ProfileImageCropDialog({
  source,
  saving,
  error,
  onClose,
  onSave,
  onEdit,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    crop: Crop;
    corner?: Corner;
  } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selection, setSelection] = useState<Crop>({ x: 0, y: 0, size: 0 });
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const busy = saving || cropping;
  const { width, height } = dimensions(image, rotation);

  useEffect(() => {
    const dialog = dialogRef.current,
      previousFocus = document.activeElement;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    const loaded = new Image();
    loaded.onload = () => {
      if (!active) return;
      const d = dimensions(loaded, 0);
      setImage(loaded);
      setSelection(initialCrop(d.width, d.height));
    };
    loaded.onerror = () => {
      if (active)
        setLocalError("이미지를 읽을 수 없습니다. 다른 사진을 선택해주세요.");
    };
    loaded.src = source;
    return () => {
      active = false;
    };
  }, [source]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(width / 2, height / 2);
    ctx.scale(flipped ? -1 : 1, 1);
    ctx.rotate((rotation * Math.PI) / 180);
    const original = dimensions(image, 0);
    ctx.drawImage(
      image,
      -original.width / 2,
      -original.height / 2,
      original.width,
      original.height,
    );
  }, [image, rotation, flipped, width, height, preview]);

  function begin(event: PointerEvent<HTMLElement>, corner?: Corner) {
    if (busy || !image || dragRef.current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      crop: selection,
      corner,
    };
    setDragging(true);
  }
  function resize(start: Crop, corner: Corner, delta: number): Crop {
    const west = corner.includes("w"),
      north = corner.includes("n");
    const anchorX = west ? start.x + start.size : start.x;
    const anchorY = north ? start.y + start.size : start.y;
    const limit = Math.min(
      west ? anchorX : width - anchorX,
      north ? anchorY : height - anchorY,
    );
    const size = clamp(
      start.size + delta,
      Math.min(width, height) * 0.15,
      limit,
    );
    return {
      x: west ? anchorX - size : anchorX,
      y: north ? anchorY - size : anchorY,
      size,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current,
      bounds = stageRef.current?.getBoundingClientRect();
    if (!drag || drag.id !== event.pointerId || !bounds) return;
    const dx = ((event.clientX - drag.x) * width) / bounds.width;
    const dy = ((event.clientY - drag.y) * height) / bounds.height;
    if (drag.corner) {
      const delta =
        (dx * (drag.corner.includes("w") ? -1 : 1) +
          dy * (drag.corner.includes("n") ? -1 : 1)) /
        2;
      setSelection(resize(drag.crop, drag.corner, delta));
    } else
      setSelection({
        ...drag.crop,
        x: clamp(drag.crop.x + dx, 0, width - drag.crop.size),
        y: clamp(drag.crop.y + dy, 0, height - drag.crop.size),
      });
  }
  function stop() {
    dragRef.current = null;
    setDragging(false);
  }
  function keyMove(event: KeyboardEvent<HTMLElement>, corner?: Corner) {
    if (
      busy ||
      !image ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const step = Math.min(width, height) * (event.shiftKey ? 0.05 : 0.01);
    const dx =
      event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy =
      event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    setSelection(
      corner
        ? resize(
            selection,
            corner,
            dx * (corner.includes("w") ? -1 : 1) +
              dy * (corner.includes("n") ? -1 : 1),
          )
        : {
            ...selection,
            x: clamp(selection.x + dx, 0, width - selection.size),
            y: clamp(selection.y + dy, 0, height - selection.size),
          },
    );
  }
  async function crop() {
    if (!canvasRef.current || !image || busy) return;
    setCropping(true);
    setLocalError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("이미지 편집기를 사용할 수 없습니다.");
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        canvasRef.current,
        selection.x,
        selection.y,
        selection.size,
        selection.size,
        0,
        0,
        512,
        512,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(
                  new Error("이미지를 자르지 못했습니다. 다시 시도해주세요."),
                ),
          "image/png",
        ),
      );
      setPreview({
        url: canvas.toDataURL("image/png"),
        file: new File([blob], "profile.png", { type: "image/png" }),
      });
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "이미지를 편집하지 못했습니다.",
      );
    } finally {
      setCropping(false);
    }
  }
  const toolClass =
    "flex size-12 items-center justify-center rounded-full hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-40";
  return (
    <dialog
      ref={dialogRef}
      aria-label={preview ? "프로필 이미지 변경 확인" : "프로필 이미지 편집"}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] max-w-[50.4rem] grid-rows-[minmax(0,1fr)_4.5625rem] overflow-hidden open:grid rounded-2xl border border-[var(--line)] bg-white p-0 text-[var(--ink)] shadow-xl backdrop:bg-black/50"
    >
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
        {preview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="flex shrink-0 items-start justify-between gap-3">
              <h2 className="pt-3 text-lg font-bold">
                프로필 이미지를 변경하시겠습니까?
              </h2>
              <button
                type="button"
                aria-label="편집 취소"
                title="취소"
                disabled={busy}
                onClick={onClose}
                className={`${toolClass} shrink-0`}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt="저장할 프로필 이미지 미리보기"
                style={{
                  width: "min(100cqw, 100cqh)",
                  height: "min(100cqw, 100cqh)",
                }}
                className="rounded-full bg-[var(--surface-muted)] object-contain ring-1 ring-[var(--line)]"
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
            <div
              ref={stageRef}
              className="relative touch-none select-none"
              style={{
                width: `min(100cqw, ${(100 * width) / height}cqh)`,
                aspectRatio: `${width} / ${height}`,
              }}
              onPointerMove={move}
              onPointerUp={stop}
              onPointerCancel={stop}
              onLostPointerCapture={stop}
            >
              <canvas
                ref={canvasRef}
                aria-label="편집할 원본 이미지"
                className="block h-full w-full rounded-lg"
              />
              {image ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        left: `${(selection.x / width) * 100}%`,
                        top: `${(selection.y / height) * 100}%`,
                        width: `${(selection.size / width) * 100}%`,
                        height: `${(selection.size / height) * 100}%`,
                      }}
                      className="absolute rounded-full border border-white/90 shadow-[0_0_0_9999px_rgba(100,105,115,0.55)]"
                    />
                  </div>
                  <div
                    role="group"
                    aria-label="원형 자르기 영역"
                    className="absolute border border-white/60"
                    style={{
                      left: `${(selection.x / width) * 100}%`,
                      top: `${(selection.y / height) * 100}%`,
                      width: `${(selection.size / width) * 100}%`,
                      height: `${(selection.size / height) * 100}%`,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="자르기 영역 이동"
                      title="드래그하거나 방향키로 이동"
                      disabled={busy}
                      onPointerDown={(event) => begin(event)}
                      onKeyDown={(event) => keyMove(event)}
                      className="absolute inset-0 cursor-move rounded-full focus-visible:outline-2 focus-visible:outline-white"
                    />
                    {dragging ? (
                      <svg
                        aria-hidden="true"
                        data-testid="crop-grid"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 h-full w-full text-white/70"
                      >
                        <path
                          d="M33.33 0v100M66.67 0v100M0 33.33h100M0 66.67h100"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.5"
                        />
                      </svg>
                    ) : null}
                    {corners.map((corner) => (
                      <button
                        key={corner.id}
                        type="button"
                        aria-label={`${corner.label} 자르기 크기 조절`}
                        title="드래그하거나 방향키로 크기 조절"
                        disabled={busy}
                        onPointerDown={(event) => begin(event, corner.id)}
                        onKeyDown={(event) => keyMove(event, corner.id)}
                        className={`absolute flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-[var(--brand-blue)] ${corner.style}`}
                      >
                        <span
                          className={`size-4 border-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${corner.id.includes("n") ? "border-t-[3px]" : "border-b-[3px]"} ${corner.id.includes("w") ? "border-l-[3px]" : "border-r-[3px]"}`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
        {localError || error ? (
          <p
            role="alert"
            className="max-h-24 shrink-0 overflow-y-auto text-sm break-words text-[var(--danger)]"
          >
            {localError ?? error}
          </p>
        ) : null}
        {busy ? (
          <p role="status" className="shrink-0 text-center text-sm">
            {saving
              ? "프로필 이미지를 저장하고 있습니다."
              : "이미지를 자르고 있습니다."}
          </p>
        ) : null}
      </div>
      <div className="flex min-h-0 items-center justify-between gap-2 border-t border-[var(--line)] bg-white px-5 py-3">
        {!preview ? (
          <button
            type="button"
            aria-label="편집 취소"
            title="취소"
            disabled={busy}
            onClick={onClose}
            className={toolClass}
          >
            <Icon name="close" />
          </button>
        ) : null}
        {preview ? (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                onEdit();
              }}
            >
              다시 편집
            </Button>
            <Button loading={busy} onClick={() => onSave(preview.file)}>
              {error ? "다시 저장" : "확인하고 저장"}
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label="이미지 시계 방향 90도 회전"
              title="90도 회전"
              disabled={!image || busy}
              onClick={() => {
                const next = (rotation + 90) % 360;
                const d = dimensions(image, next);
                setRotation(next);
                setSelection(initialCrop(d.width, d.height));
              }}
              className={toolClass}
            >
              <Icon name="rotate" />
            </button>
            <button
              type="button"
              aria-label="이미지 좌우 반전"
              title="좌우 반전"
              aria-pressed={flipped}
              disabled={!image || busy}
              onClick={() => setFlipped(!flipped)}
              className={`${toolClass} ${flipped ? "bg-[var(--surface-muted)] text-[var(--brand-blue)]" : ""}`}
            >
              <Icon name="flip" />
            </button>
            <button
              type="button"
              aria-label="자르기 완료"
              title="편집 완료"
              disabled={!image || busy || Boolean(localError)}
              onClick={() => void crop()}
              className={`${toolClass} text-[var(--brand-blue)]`}
            >
              <Icon name="check" />
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
