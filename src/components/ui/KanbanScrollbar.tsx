import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface KanbanScrollbarProps {
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
}

/**
 * Barra horizontal fina, sincronizada com o quadro.
 * A posição é atualizada direto no elemento (sem re-render do React), uma vez por quadro
 * de animação, para o movimento ficar fluido mesmo com muitas colunas.
 */
export function KanbanScrollbar({ targetRef, className }: KanbanScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const paint = useCallback(() => {
    frame.current = 0;
    const target = targetRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!target || !track || !thumb) return;
    const trackW = track.clientWidth;
    const maxScroll = target.scrollWidth - target.clientWidth;
    track.style.visibility = maxScroll > 1 ? 'visible' : 'hidden';
    const width = Math.max(56, trackW * (target.clientWidth / Math.max(1, target.scrollWidth)));
    const left = maxScroll > 0 ? (target.scrollLeft / maxScroll) * (trackW - width) : 0;
    thumb.style.width = `${width}px`;
    thumb.style.transform = `translate3d(${left}px,0,0)`;
  }, [targetRef]);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    paint();
    target.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(target);
    Array.from(target.children).forEach(c => ro.observe(c as Element));
    return () => {
      target.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [targetRef, paint, schedule]);

  /** Clicar na trilha leva o quadro até aquele ponto, com rolagem suave. */
  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (e.target === thumbRef.current) return;
    const target = targetRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!target || !track || !thumb) return;
    const rect = track.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - thumb.offsetWidth / 2) / Math.max(1, rect.width - thumb.offsetWidth);
    const maxScroll = target.scrollWidth - target.clientWidth;
    target.scrollTo({ left: Math.max(0, Math.min(1, ratio)) * maxScroll, behavior: 'smooth' });
  };

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = targetRef.current;
    const track = trackRef.current;
    if (!target || !track) return;
    const thumb = e.currentTarget;
    thumb.setPointerCapture(e.pointerId);
    thumb.dataset.dragging = 'true';
    const startX = e.clientX;
    const startScroll = target.scrollLeft;
    const maxScroll = target.scrollWidth - target.clientWidth;
    const usable = Math.max(1, track.clientWidth - thumb.offsetWidth);
    let pending = 0;
    let nextLeft = startScroll;

    const onMove = (ev: PointerEvent) => {
      nextLeft = Math.max(0, Math.min(maxScroll, startScroll + ((ev.clientX - startX) / usable) * maxScroll));
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; target.scrollLeft = nextLeft; });
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
  };

  return (
    <div
      ref={trackRef}
      className={cn('group shrink-0 w-full h-2.5 rounded-full bg-muted relative select-none cursor-pointer', className)}
      onPointerDown={handleTrackPointerDown}
      aria-hidden="true"
    >
      <div
        ref={thumbRef}
        className="absolute left-0 top-0 h-full rounded-full bg-primary/45 hover:bg-primary/70 data-[dragging=true]:bg-primary/80 cursor-grab data-[dragging=true]:cursor-grabbing will-change-transform"
        onPointerDown={handleThumbPointerDown}
      />
    </div>
  );
}
