import React, { useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Move, Plus, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type MediaLightboxProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

type MediaView = {
  scale: number;
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const DEFAULT_MEDIA_VIEW: MediaView = { scale: 1, x: 0, y: 0 };
const MIN_MEDIA_SCALE = 0.5;
const MAX_MEDIA_SCALE = 5;

export const MediaLightbox = ({ open, title, onClose, children }: MediaLightboxProps) => {
  const [view, setView] = useState<MediaView>(DEFAULT_MEDIA_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const wheelZoomTimeoutRef = useRef<number | null>(null);

  const resetView = useCallback(() => {
    setView(DEFAULT_MEDIA_VIEW);
  }, []);

  const zoomByFactor = useCallback((factor: number) => {
    setView((current) => ({
      ...current,
      scale: clamp(Number((current.scale * factor).toFixed(4)), MIN_MEDIA_SCALE, MAX_MEDIA_SCALE),
    }));
  }, []);

  useEffect(() => {
    if (!open) return;

    resetView();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomByFactor(1.16);
        return;
      }

      if (event.key === '-') {
        event.preventDefault();
        zoomByFactor(1 / 1.16);
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        resetView();
      }
    };

    const preventPageWheel = (event: WheelEvent) => {
      event.preventDefault();
    };

    const preventPageGesture = (event: Event) => {
      event.preventDefault();
    };

    const blockZoomEventOptions: AddEventListenerOptions = { capture: true, passive: false };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('wheel', preventPageWheel, blockZoomEventOptions);
    window.addEventListener('gesturestart', preventPageGesture, blockZoomEventOptions);
    window.addEventListener('gesturechange', preventPageGesture, blockZoomEventOptions);
    window.addEventListener('gestureend', preventPageGesture, blockZoomEventOptions);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('wheel', preventPageWheel, true);
      window.removeEventListener('gesturestart', preventPageGesture, true);
      window.removeEventListener('gesturechange', preventPageGesture, true);
      window.removeEventListener('gestureend', preventPageGesture, true);
      if (wheelZoomTimeoutRef.current) {
        window.clearTimeout(wheelZoomTimeoutRef.current);
        wheelZoomTimeoutRef.current = null;
      }
    };
  }, [onClose, open, resetView, zoomByFactor]);

  if (!open || typeof document === 'undefined') return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setView((current) => ({
      ...current,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left - rect.width / 2;
    const pointerY = event.clientY - rect.top - rect.height / 2;
    const normalizedDelta = Math.max(-80, Math.min(80, event.deltaY));
    const factor = Math.exp(-normalizedDelta * 0.0022);

    setIsWheelZooming(true);
    if (wheelZoomTimeoutRef.current) window.clearTimeout(wheelZoomTimeoutRef.current);
    wheelZoomTimeoutRef.current = window.setTimeout(() => {
      setIsWheelZooming(false);
      wheelZoomTimeoutRef.current = null;
    }, 90);

    setView((current) => {
      const nextScale = clamp(Number((current.scale * factor).toFixed(4)), MIN_MEDIA_SCALE, MAX_MEDIA_SCALE);
      if (nextScale === current.scale) return current;

      const contentX = (pointerX - current.x) / current.scale;
      const contentY = (pointerY - current.y) / current.scale;

      return {
        scale: nextScale,
        x: pointerX - contentX * nextScale,
        y: pointerY - contentY * nextScale,
      };
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col bg-black/82 text-white"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/12 bg-black/35 px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-white/70">
          <Move size={15} />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              zoomByFactor(1 / 1.16);
            }}
            className="inline-flex size-9 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="缩小"
            title="缩小"
          >
            <Minus size={17} />
          </button>
          <span className="w-12 text-center font-mono text-[11px] text-white/65">{Math.round(view.scale * 100)}%</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              zoomByFactor(1.16);
            }}
            className="inline-flex size-9 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="放大"
            title="放大"
          >
            <Plus size={17} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              resetView();
            }}
            className="inline-flex size-9 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="重置"
            title="重置"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="inline-flex size-9 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="关闭"
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div
        className={cn('relative min-h-0 flex-1 overflow-hidden', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className={cn(
            'flex h-full w-full items-center justify-center p-6 will-change-transform',
            isDragging || isWheelZooming ? 'transition-none' : 'transition-transform duration-150 ease-out',
          )}
          onClick={(event) => event.stopPropagation()}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            transformOrigin: 'center center',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

type ZoomableImageProps = ComponentPropsWithoutRef<'img'> & {
  alt: string;
  previewTitle?: string;
};

export const ZoomableImage = ({
  className,
  alt,
  src,
  onClick,
  onKeyDown,
  previewTitle,
  ...props
}: ZoomableImageProps) => {
  const [open, setOpen] = useState(false);
  const canOpen = typeof src === 'string' && src.length > 0;
  const title = previewTitle || alt || '图片详情';

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !canOpen) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLImageElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !canOpen || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <img
        className={cn('mx-auto rounded-lg transition-opacity hover:opacity-90', canOpen && 'cursor-zoom-in', className)}
        alt={alt}
        src={src}
        loading="lazy"
        role={canOpen ? 'button' : undefined}
        tabIndex={canOpen ? 0 : undefined}
        title={canOpen ? '查看图片详情' : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      />
      <MediaLightbox open={open} title={title} onClose={() => setOpen(false)}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="h-[86vh] w-[92vw] select-none rounded-md object-contain shadow-2xl"
        />
      </MediaLightbox>
    </>
  );
};
