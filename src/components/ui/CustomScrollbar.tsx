import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
}

/**
 * Barra vertical fina, no mesmo padrão da barra horizontal do quadro.
 * A posição é atualizada direto no elemento, uma vez por quadro de animação.
 */
export function CustomScrollbar({
  children,
  className,
  trackClassName,
  thumbClassName,
}: CustomScrollbarProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const paint = useCallback(() => {
    frame.current = 0;
    const el = contentRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;
    const { clientHeight, scrollHeight, scrollTop } = el;
    const maxScroll = scrollHeight - clientHeight;
    track.style.display = maxScroll > 1 ? '' : 'none';
    if (maxScroll <= 1) return;
    const height = Math.max(32, clientHeight * (clientHeight / scrollHeight));
    const top = (scrollTop / maxScroll) * (clientHeight - height);
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translate3d(0,${top}px,0)`;
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    paint();
    el.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [paint, schedule]);

  const handleThumbPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = contentRef.current;
    if (!el) return;
    const thumb = e.currentTarget;
    thumb.setPointerCapture(e.pointerId);
    thumb.dataset.dragging = 'true';
    const startY = e.clientY;
    const startTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const usable = Math.max(1, el.clientHeight - thumb.offsetHeight);
    let pending = 0;
    let next = startTop;
    const onMove = (ev: PointerEvent) => {
      next = Math.max(0, Math.min(maxScroll, startTop + ((ev.clientY - startY) / usable) * maxScroll));
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; el.scrollTop = next; });
    };
    const onUp = () => {
      delete thumb.dataset.dragging;
      thumb.removeEventListener('pointermove', onMove);
      thumb.removeEventListener('pointerup', onUp);
      thumb.removeEventListener('pointercancel', onUp);
    };
    thumb.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerup', onUp);
    thumb.addEventListener('pointercancel', onUp);
  }, []);

  return (
    <div className={cn("relative flex flex-col min-h-0 h-full", className)}>
      <div
        ref={contentRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain pr-3"
        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      <div
        ref={trackRef}
        data-testid="custom-scrollbar-track"
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-2 rounded-full bg-muted z-10 hidden md:block",
          trackClassName,
        )}
        style={{ display: 'none' }}
      >
        <div
          ref={thumbRef}
          data-testid="custom-scrollbar-thumb"
          className={cn(
            "pointer-events-auto absolute left-0 top-0 w-full rounded-full bg-primary/45 hover:bg-primary/70 data-[dragging=true]:bg-primary/80 cursor-grab data-[dragging=true]:cursor-grabbing will-change-transform",
            thumbClassName,
          )}
          onPointerDown={handleThumbPointerDown}
        />
      </div>
    </div>
  );
}
