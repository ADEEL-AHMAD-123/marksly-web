'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Minus, Plus, RotateCcw, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// The visible crop viewport, in CSS px — square, since every ID card photo
// slot in this app (front-of-card avatar, admin table thumbnails) is round/
// square, never portrait or landscape.
const VIEWPORT_SIZE = 260;
// The exported photo's pixel dimensions — comfortably above what the ID
// card ever renders it at, so it still looks sharp when printed at real
// card size, without producing an unnecessarily large file.
const OUTPUT_SIZE = 480;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface Props {
  open: boolean;
  file: File | null;
  onClose: () => void;
  /** Receives the cropped, exported photo as a File ready to upload. */
  onCropped: (file: File) => void;
}

/**
 * A from-scratch crop/zoom/reposition editor for profile photos — no
 * external cropping library, just pointer-drag panning plus a zoom slider
 * rendered onto a canvas at export time. Used by every profile-photo
 * upload control in the app (self-service MyPhotoUploader and the
 * admin-facing PhotoUpload) so a person can actually frame their own face
 * before it becomes their permanent ID card photo, instead of hoping
 * whatever they happened to select crops well automatically.
 */
export function PhotoCropModal({ open, file, onClose, onCropped }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // baseScale makes the image's SHORTER side exactly fill the square
  // viewport at zoom=1 (a "cover" fit) — the same behavior as CSS
  // object-fit: cover, just computed manually since we need the same
  // numbers again at export time.
  const baseScale = useMemo(() => {
    if (!naturalSize) return 1;
    return VIEWPORT_SIZE / Math.min(naturalSize.w, naturalSize.h);
  }, [naturalSize]);
  const effectiveScale = baseScale * zoom;

  const clampOffset = (x: number, y: number, scale: number) => {
    if (!naturalSize) return { x: 0, y: 0 };
    const displayedW = naturalSize.w * scale;
    const displayedH = naturalSize.h * scale;
    const maxX = Math.max(0, (displayedW - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (displayedH - VIEWPORT_SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.offsetX + dx, dragStart.current.offsetY + dy, effectiveScale));
  };
  const handlePointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const changeZoom = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(z);
    setOffset((prev) => clampOffset(prev.x, prev.y, baseScale * z));
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleSave = () => {
    if (!imgRef.current || !naturalSize) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Map the visible viewport back to natural-image pixel coordinates —
    // see the geometry note in the class comment above: the image is drawn
    // centered in the viewport then shifted by `offset`, so the region of
    // the ORIGINAL image currently showing through the square viewport is
    // this rectangle.
    const displayedW = naturalSize.w * effectiveScale;
    const displayedH = naturalSize.h * effectiveScale;
    const imgLeft = (VIEWPORT_SIZE - displayedW) / 2 + offset.x;
    const imgTop = (VIEWPORT_SIZE - displayedH) / 2 + offset.y;
    const sx = -imgLeft / effectiveScale;
    const sy = -imgTop / effectiveScale;
    const sSize = VIEWPORT_SIZE / effectiveScale;

    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const cropped = new File([blob], (file?.name ?? 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
        onCropped(cropped);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <ImagePlus size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">Adjust your photo</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Use a clear, front-facing photo with a plain background — like a passport photo. Drag to reposition and use the slider to zoom, so your face is centered and fills the frame.
          </DialogPrimitive.Description>

          <div
            className="relative mx-auto mt-4 touch-none select-none overflow-hidden rounded-full border-2 border-primary/30 bg-muted"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={imageUrl}
                alt=""
                crossOrigin="anonymous"
                draggable={false}
                onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none cursor-move"
                style={{
                  width: naturalSize ? naturalSize.w * effectiveScale : undefined,
                  height: naturalSize ? naturalSize.h * effectiveScale : undefined,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Minus size={14} className="shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              aria-label="Zoom"
            />
            <Plus size={14} className="shrink-0 text-muted-foreground" />
            <button
              type="button"
              onClick={reset}
              title="Reset"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!naturalSize}>
              <Check size={14} /> Use this photo
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
